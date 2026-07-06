import { logger } from '../../logger/logger.js';
import eventManager, { MutationType, QueryMetadata, TriggerResult } from '../eventManager.js';
import { DynamicObject } from '../types/customExpressTypes.js';
import { PsqlPool } from './PsqlPool.js';
import { PsqlTransaction } from './PsqlTransaction.js';
import { DEFAULT_OUTBOX_CHANNEL, OUTBOX_TABLE_NAME, systemUser } from './psqlSchemaUtils.js';

export interface EventOutboxOptions {
	channel: string;
	pollIntervalMs: number;
	batchSize: number;
	maxAttempts: number;
	pruneAfterDays: number;
}

export const defaultEventOutboxOptions: EventOutboxOptions = {
	channel: DEFAULT_OUTBOX_CHANNEL,
	pollIntervalMs: 15000,
	batchSize: 50,
	maxAttempts: 5,
	pruneAfterDays: 7
};

export interface EventDeliveryConfig {
	mode: 'direct' | 'outbox';
	outbox?: Partial<EventOutboxOptions>;
}

export interface OutboxRow {
	id: number;
	createdOn: string;
	tableName: string;
	operation: MutationType;
	recordId: number | null;
	record: DynamicObject | null;
	previousRecord: DynamicObject | null;
	queryMetadata: QueryMetadata | null;
	processedOn: string | null;
	attempts: number;
	nextAttemptOn: string | null;
	isDeadLetter: boolean;
}

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

export class EventOutboxConsumer {
	private options: EventOutboxOptions;
	private isDraining = false;
	private drainRequested = false;
	private isStopped = false;
	private pollTimer: NodeJS.Timeout | undefined;
	private pruneTimer: NodeJS.Timeout | undefined;
	private activeDrain: Promise<void> = Promise.resolve();
	private lastDrainOn: string | null = null;

	constructor(
		private psqlConnectionPool: PsqlPool,
		options?: Partial<EventOutboxOptions>
	) {
		this.options = { ...defaultEventOutboxOptions, ...options };
	}

	get channel(): string {
		return this.options.channel;
	}

	start() {
		this.isStopped = false;
		this.pollTimer = setInterval(() => void this.drain(), this.options.pollIntervalMs);
		this.pruneTimer = setInterval(() => void this.prune(), PRUNE_INTERVAL_MS);
		void this.drain();
		void this.prune();
	}

	async stop() {
		this.isStopped = true;
		if (this.pollTimer) clearInterval(this.pollTimer);
		if (this.pruneTimer) clearInterval(this.pruneTimer);
		await this.activeDrain;
	}

	/** Safe to call at any frequency; overlapping calls coalesce into one extra pass. */
	async drain(): Promise<void> {
		if (this.isDraining) {
			this.drainRequested = true;
			return;
		}
		this.isDraining = true;
		this.activeDrain = (async () => {
			try {
				do {
					this.drainRequested = false;
					let processedCount = 0;
					do {
						processedCount = await this.processBatch();
					} while (processedCount > 0 && !this.isStopped);
				} while (this.drainRequested && !this.isStopped);
				this.lastDrainOn = new Date().toISOString();
			} catch (error) {
				logger.error(`Event outbox drain failed: ${error}`);
			} finally {
				this.isDraining = false;
			}
		})();
		await this.activeDrain;
	}

	async getStats(): Promise<{ pendingCount: number; deadLetterCount: number; lastDrainOn: string | null }> {
		const result = await this.psqlConnectionPool.runQuery<{ pendingCount: number; deadLetterCount: number }>(
			`SELECT
				COUNT(*) FILTER (WHERE "processedOn" IS NULL AND "isDeadLetter" = FALSE) AS "pendingCount",
				COUNT(*) FILTER (WHERE "isDeadLetter" = TRUE) AS "deadLetterCount"
			FROM "${OUTBOX_TABLE_NAME}";`,
			[],
			systemUser
		);
		return {
			pendingCount: Number(result[0]?.pendingCount || 0),
			deadLetterCount: Number(result[0]?.deadLetterCount || 0),
			lastDrainOn: this.lastDrainOn
		};
	}

	private async processBatch(): Promise<number> {
		const transaction = new PsqlTransaction({
			host: this.psqlConnectionPool.poolConfig.host,
			port: this.psqlConnectionPool.poolConfig.port,
			user: this.psqlConnectionPool.poolConfig.user,
			password: this.psqlConnectionPool.poolConfig.password,
			database: this.psqlConnectionPool.poolConfig.database,
			connectionTimeoutMillis: this.psqlConnectionPool.poolConfig.connectionTimeoutMillis
		});
		try {
			const rows = await transaction.runQuery<OutboxRow>(
				`SELECT * FROM "${OUTBOX_TABLE_NAME}"
				WHERE "processedOn" IS NULL AND "isDeadLetter" = FALSE
				AND ("nextAttemptOn" IS NULL OR "nextAttemptOn" <= now())
				ORDER BY "id"
				LIMIT ?
				FOR UPDATE SKIP LOCKED;`,
				[this.options.batchSize],
				systemUser
			);
			// Rows are processed sequentially so same-entity events keep their commit order
			for (const row of rows) {
				await this.processRow(transaction, row);
			}
			await transaction.commit();
			return rows.length;
		} catch (error) {
			try {
				await transaction.rollback();
			} catch {}
			throw error;
		} finally {
			await transaction.release();
		}
	}

	private async processRow(transaction: PsqlTransaction, row: OutboxRow) {
		try {
			const triggerResult: TriggerResult = {
				table: row.tableName,
				insertedId: row.operation === 'INSERT' ? (row.recordId ?? undefined) : undefined,
				changedId: row.operation === 'UPDATE' ? (row.recordId ?? undefined) : undefined,
				deletedId: row.operation === 'DELETE' ? (row.recordId ?? undefined) : undefined,
				queryMetadata: (row.queryMetadata ?? {}) as QueryMetadata,
				record: row.record ?? {},
				previousRecord: row.previousRecord ?? {},
				requesterId: 0
			};
			await eventManager.fireActionFromDbTrigger(
				{ mutationType: row.operation, queryMetadata: triggerResult.queryMetadata },
				triggerResult,
				{ rethrowHandlerErrors: true }
			);
			await transaction.runQuery(
				`UPDATE "${OUTBOX_TABLE_NAME}" SET "processedOn" = now() WHERE "id" = ?;`,
				[row.id],
				systemUser
			);
		} catch (error) {
			const attempts = row.attempts + 1;
			const isDeadLetter = attempts >= this.options.maxAttempts;
			if (isDeadLetter) {
				logger.error(
					`Event outbox row ${row.id} (${row.tableName} ${row.operation}) moved to dead letter after ${attempts} attempts: ${error}`
				);
			} else {
				logger.warn(
					`Event outbox row ${row.id} (${row.tableName} ${row.operation}) attempt ${attempts} failed: ${error}`
				);
			}
			// Exponential retry backoff: 30s, 60s, 120s, ...
			const backoffSeconds = 30 * Math.pow(2, row.attempts);
			await transaction.runQuery(
				`UPDATE "${OUTBOX_TABLE_NAME}"
				SET "attempts" = ?, "isDeadLetter" = ?, "nextAttemptOn" = now() + (? || ' seconds')::interval
				WHERE "id" = ?;`,
				[attempts, isDeadLetter, backoffSeconds, row.id],
				systemUser
			);
		}
	}

	private async prune() {
		try {
			await this.psqlConnectionPool.runQuery(
				`DELETE FROM "${OUTBOX_TABLE_NAME}"
				WHERE "processedOn" IS NOT NULL
				AND "isDeadLetter" = FALSE
				AND "processedOn" < now() - (? || ' days')::interval;`,
				[this.options.pruneAfterDays],
				systemUser
			);
		} catch (error) {
			logger.error(`Event outbox prune failed: ${error}`);
		}
	}
}

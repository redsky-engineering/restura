import Bluebird from 'bluebird';
import { UUID } from 'crypto';
import { logger } from '../logger/logger.js';
import { DynamicObject, RequesterDetails } from './types/customExpressTypes.js';

export type EventType = 'DATABASE_ROW_DELETE' | 'DATABASE_ROW_INSERT' | 'DATABASE_COLUMN_UPDATE' | 'WEBHOOK';
export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE';
export interface SqlMutationData {
	mutationType: MutationType;
	queryMetadata: QueryMetadata;
}

export interface DatabaseActionData {
	tableName: string;
	queryMetadata: QueryMetadata;
}

export interface ActionRowInsertData<T = DynamicObject> extends DatabaseActionData {
	insertedId: number;
	insertObject: T;
}

export interface ActionRowDeleteData<T = DynamicObject> extends DatabaseActionData {
	deletedId: number;
	deletedRow: T;
}

export interface ActionColumnChangeData<T = DynamicObject> extends DatabaseActionData {
	tableName: string;
	changedId: number;
	newData: T;
	oldData: T;
}

export interface ActionRowInsertFilter {
	tableName: string;
}

export interface ActionRowDeleteFilter {
	tableName: string;
}

export interface ActionColumnChangeFilter {
	tableName: string;
	columns: string[];
}

export type TriggerResult = {
	table: string;
	insertedId?: number;
	changedId?: number;
	deletedId?: number;
	queryMetadata: QueryMetadata;
	record: DynamicObject;
	previousRecord: DynamicObject;
	requesterId: number;
};

export type QueryMetadata = RequesterDetails & {
	connectionInstanceId: UUID;
};

class EventManager {
	private actionHandlers: {
		DATABASE_ROW_DELETE: {
			callback: (data: ActionRowDeleteData, queryMetadata: QueryMetadata) => Promise<void>;
			filter?: ActionRowDeleteFilter;
		}[];
		DATABASE_ROW_INSERT: {
			callback: (data: ActionRowInsertData, queryMetadata: QueryMetadata) => Promise<void>; // Non-generic here
			filter?: ActionRowInsertFilter;
		}[];
		DATABASE_COLUMN_UPDATE: {
			callback: (data: ActionColumnChangeData, queryMetadata: QueryMetadata) => Promise<void>;
			filter?: ActionColumnChangeFilter;
		}[];
	} = {
		DATABASE_ROW_DELETE: [],
		DATABASE_ROW_INSERT: [],
		DATABASE_COLUMN_UPDATE: []
	};

	addRowInsertHandler<T>(
		onInsert: (data: ActionRowInsertData<T>, queryMetadata: QueryMetadata) => Promise<void>,
		filter?: ActionRowInsertFilter
	) {
		this.actionHandlers.DATABASE_ROW_INSERT.push({
			callback: onInsert as (data: ActionRowInsertData, queryMetadata: QueryMetadata) => Promise<void>,
			filter
		});
	}

	addColumnChangeHandler<T>(
		onUpdate: (data: ActionColumnChangeData<T>, queryMetadata: QueryMetadata) => Promise<void>,
		filter: ActionColumnChangeFilter
	) {
		this.actionHandlers.DATABASE_COLUMN_UPDATE.push({
			callback: onUpdate as (data: ActionColumnChangeData, queryMetadata: QueryMetadata) => Promise<void>,
			filter
		});
	}

	addRowDeleteHandler<T>(
		onDelete: (data: ActionRowDeleteData<T>, queryMetadata: QueryMetadata) => Promise<void>,
		filter?: ActionRowDeleteFilter
	) {
		this.actionHandlers.DATABASE_ROW_DELETE.push({
			callback: onDelete as (data: ActionRowDeleteData, queryMetadata: QueryMetadata) => Promise<void>,
			filter
		});
	}

	async fireActionFromDbTrigger(sqlMutationData: SqlMutationData, result: TriggerResult) {
		if (sqlMutationData.mutationType === 'INSERT') {
			await this.fireInsertActions(sqlMutationData, result);
		} else if (sqlMutationData.mutationType === 'UPDATE') {
			await this.fireUpdateActions(sqlMutationData, result);
		} else if (sqlMutationData.mutationType === 'DELETE') {
			await this.fireDeleteActions(sqlMutationData, result);
		}
	}

	private async fireInsertActions(data: SqlMutationData, triggerResult: TriggerResult) {
		await Bluebird.map(
			this.actionHandlers.DATABASE_ROW_INSERT,
			async ({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_ROW_INSERT', filter, triggerResult)) return;
				const insertData: ActionRowInsertData = {
					tableName: triggerResult.table,
					insertedId: triggerResult.insertedId || 0,
					insertObject: triggerResult.record,
					queryMetadata: data.queryMetadata
				};

				try {
					await callback(insertData, data.queryMetadata);
				} catch (error) {
					logger.error(`Error firing insert action for table ${triggerResult.table}`, error);
				}
			},
			{ concurrency: 10 }
		);
	}
	private async fireDeleteActions(data: SqlMutationData, triggerResult: TriggerResult) {
		await Bluebird.map(
			this.actionHandlers.DATABASE_ROW_DELETE,
			async ({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_ROW_DELETE', filter, triggerResult)) return;
				const deleteData: ActionRowDeleteData = {
					tableName: triggerResult.table,
					deletedId: triggerResult.deletedId || 0,
					deletedRow: triggerResult.previousRecord,
					queryMetadata: data.queryMetadata
				};

				try {
					await callback(deleteData, data.queryMetadata);
				} catch (error) {
					logger.error(`Error firing delete action for table ${triggerResult.table}`, error);
				}
			},
			{ concurrency: 10 }
		);
	}
	private async fireUpdateActions(data: SqlMutationData, triggerResult: TriggerResult) {
		await Bluebird.map(
			this.actionHandlers.DATABASE_COLUMN_UPDATE,
			async ({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_COLUMN_UPDATE', filter, triggerResult)) return;
				const columnChangeData: ActionColumnChangeData = {
					tableName: triggerResult.table,
					changedId: triggerResult.changedId || 0,
					newData: triggerResult.record,
					oldData: triggerResult.previousRecord,
					queryMetadata: data.queryMetadata
				};

				try {
					await callback(columnChangeData, data.queryMetadata);
				} catch (error) {
					logger.error(`Error firing update action for table ${triggerResult.table}`, error);
				}
			},
			{ concurrency: 10 }
		);
	}

	private hasHandlersForEventType(
		eventType: EventType,
		filter: { tableName?: string; columns?: string[] } | undefined,
		triggerResult: TriggerResult
	): boolean {
		if (filter) {
			switch (eventType) {
				case 'DATABASE_ROW_INSERT':
				case 'DATABASE_ROW_DELETE':
					if (filter.tableName && filter.tableName !== triggerResult.table) return false;
					break;
				case 'DATABASE_COLUMN_UPDATE':
					const filterColumnChange = filter as ActionColumnChangeFilter;

					if (filterColumnChange.tableName !== triggerResult.table) return false;

					if (filterColumnChange.columns.length === 1) {
						const firstColumn = filterColumnChange.columns[0];
						if (firstColumn === '*') return true;
					}

					if (
						!filterColumnChange.columns.some((item) => {
							const updatedColumns = Object.keys(
								changedValues(triggerResult.record, triggerResult.previousRecord)
							);
							return updatedColumns.includes(item);
						})
					)
						return false;
					break;
			}
		}
		return true;
	}
}

const eventManager = new EventManager();
export default eventManager;

function changedValues(record: DynamicObject, previousRecord: DynamicObject) {
	const changed: DynamicObject = {};
	for (const i in previousRecord) {
		if (previousRecord[i] !== record[i]) {
			if (typeof previousRecord[i] === 'object' && typeof record[i] === 'object') {
				const nestedChanged = changedValues(record[i] as DynamicObject, previousRecord[i] as DynamicObject);
				if (Object.keys(nestedChanged).length > 0) {
					changed[i] = record[i];
				}
			} else {
				changed[i] = record[i];
			}
		}
	}
	return changed;
}

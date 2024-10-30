import { DynamicObject, RequesterDetails } from './types/customExpress.types.js';
import Bluebird from 'bluebird';

export type EventType = 'DATABASE_ROW_DELETE' | 'DATABASE_ROW_INSERT' | 'DATABASE_COLUMN_UPDATE' | 'WEBHOOK';
export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE';
export interface SqlMutationData {
	mutationType: MutationType;
	requesterDetails: RequesterDetails;
}

export interface DatabaseActionData {
	tableName: string;
	requesterDetails: RequesterDetails;
}

export interface ActionRowInsertData<T = DynamicObject> extends DatabaseActionData {
	insertId: number;
	insertObject: T;
}

export interface ActionRowDeleteData extends DatabaseActionData {
	deletedRow: DynamicObject;
}

export interface ActionColumnChangeData extends DatabaseActionData {
	tableName: string;
	rowId: number;
	newData: DynamicObject;
	oldData: DynamicObject;
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
	insertId?: number;
	query: string;
	record: DynamicObject;
	previousRecord: DynamicObject;
	requesterId: number;
};

class EventManager {
	private actionHandlers: {
		DATABASE_ROW_DELETE: {
			callback: (data: ActionRowDeleteData, requesterDetails: RequesterDetails) => Promise<void>;
			filter?: ActionRowDeleteFilter;
		}[];
		DATABASE_ROW_INSERT: {
			callback: (data: ActionRowInsertData, requesterDetails: RequesterDetails) => Promise<void>;
			filter?: ActionRowInsertFilter;
		}[];
		DATABASE_COLUMN_UPDATE: {
			callback: (data: ActionColumnChangeData, requesterDetails: RequesterDetails) => Promise<void>;
			filter?: ActionColumnChangeFilter;
		}[];
	} = {
		DATABASE_ROW_DELETE: [],
		DATABASE_ROW_INSERT: [],
		DATABASE_COLUMN_UPDATE: []
	};

	addRowInsertHandler(
		onInsert: (data: ActionRowInsertData<unknown>) => Promise<void>,
		filter?: ActionRowInsertFilter
	) {
		this.actionHandlers.DATABASE_ROW_INSERT.push({
			callback: onInsert,
			filter
		});
	}
	addColumnChangeHandler(
		onUpdate: (data: ActionColumnChangeData) => Promise<void>,
		filter: ActionColumnChangeFilter
	) {
		this.actionHandlers.DATABASE_COLUMN_UPDATE.push({
			callback: onUpdate,
			filter
		});
	}

	addRowDeleteHandler(onDelete: (data: ActionRowDeleteData) => Promise<void>, filter?: ActionRowDeleteFilter) {
		this.actionHandlers.DATABASE_ROW_DELETE.push({
			callback: onDelete,
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
			({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_ROW_INSERT', filter, triggerResult)) return;
				const insertData: ActionRowInsertData = {
					tableName: triggerResult.table,
					insertId: triggerResult.record.id as number,
					insertObject: triggerResult.record,
					requesterDetails: data.requesterDetails
				};
				callback(insertData, data.requesterDetails);
			},
			{ concurrency: 10 }
		);
	}
	private async fireDeleteActions(data: SqlMutationData, triggerResult: TriggerResult) {
		await Bluebird.map(
			this.actionHandlers.DATABASE_ROW_DELETE,
			({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_ROW_DELETE', filter, triggerResult)) return;
				const deleteData: ActionRowDeleteData = {
					tableName: triggerResult.table,
					deletedRow: triggerResult.previousRecord,
					requesterDetails: data.requesterDetails
				};
				callback(deleteData, data.requesterDetails);
			},
			{ concurrency: 10 }
		);
	}
	private async fireUpdateActions(data: SqlMutationData, triggerResult: TriggerResult) {
		await Bluebird.map(
			this.actionHandlers.DATABASE_COLUMN_UPDATE,
			({ callback, filter }) => {
				if (!this.hasHandlersForEventType('DATABASE_COLUMN_UPDATE', filter, triggerResult)) return;
				const columnChangeData: ActionColumnChangeData = {
					tableName: triggerResult.table,
					rowId: triggerResult.record.id as number,
					newData: triggerResult.record,
					oldData: triggerResult.previousRecord,
					requesterDetails: data.requesterDetails
				};
				callback(columnChangeData, data.requesterDetails);
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
					if (filterColumnChange.tableName !== filter.tableName) return false;
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

const changedValues = (record: DynamicObject, previousRecord: DynamicObject) => {
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
};

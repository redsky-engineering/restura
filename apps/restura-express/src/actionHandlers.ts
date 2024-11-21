import {
	eventManager,
	type ActionColumnChangeData,
	type ActionRowDeleteData,
	type ActionRowInsertData,
	type QueryMetadata
} from '@restura/core';
import { boundMethod } from 'autobind-decorator';

class ActionHandlers {
	init() {
		eventManager.addColumnChangeHandler<Model.User>(this.handleFirstNameChange, {
			tableName: 'user',
			columns: ['firstName']
		});

		eventManager.addRowInsertHandler<Model.User>(this.handleUserInsert, {
			tableName: 'user'
		});

		eventManager.addRowDeleteHandler<Model.User>(this.handleUserDelete, {
			tableName: 'user'
		});
	}

	@boundMethod
	private async handleFirstNameChange(data: ActionColumnChangeData<Model.User>, queryMetadata: QueryMetadata) {
		console.log('old first name: ', data.oldData.firstName);
		console.log('new first name: ', data.newData.firstName);
		console.log('Column Change', data, queryMetadata);
	}

	@boundMethod
	private async handleUserInsert(data: ActionRowInsertData<Model.User>, queryMetadata: QueryMetadata) {
		console.log('User Inserted: ', data.insertObject, queryMetadata);
	}

	@boundMethod
	private async handleUserDelete(data: ActionRowDeleteData<Model.User>, queryMetadata: QueryMetadata) {
		console.log('User Deleted: ', data.deletedRow, queryMetadata);
	}
}

const actionHandlers = new ActionHandlers();
export default actionHandlers;

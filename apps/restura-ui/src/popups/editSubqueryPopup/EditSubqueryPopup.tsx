import * as React from 'react';
import './EditSubqueryPopup.scss';
import { Box, Button, Icon, Label, Popup, popupController, PopupProps, rsToastify } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useState } from 'react';
import cloneDeep from 'lodash.clonedeep';
import BaseTableInput from '../../components/baseTableInput/BaseTableInput.js';
import JoinTableInput from '../../components/joinTableInput/JoinTableInput.js';
import useRouteData from '../../customHooks/useRouteData.js';
import SchemaService from '../../services/schema/SchemaService.js';
import WhereClauseInput from '../../components/whereClauseInput/WhereClauseInput.js';
import GroupByInput from '../../components/groupByInput/GroupByInput.js';
import OrderByInput from '../../components/orderByInput/OrderByInput.js';

export interface EditSubqueryPopupProps extends PopupProps {
	response: Restura.ResponseData;
	onSave: (response: Restura.ResponseData) => void;
}

const EditSubqueryPopup: React.FC<EditSubqueryPopupProps> = (props) => {
	const routeData = useRouteData();
	const [response, setResponse] = useState<Restura.ResponseData>(cloneDeep(props.response));

	function handleClose() {
		popupController.close(EditSubqueryPopup);
	}

	function handleSave() {
		if (!response.subquery?.table) {
			rsToastify.error('Please select a base table.', 'Missing Base Table');
			return;
		}
		props.onSave(response);
		popupController.close(EditSubqueryPopup);
	}

	function isModified(): boolean {
		return JSON.stringify(props.response) !== JSON.stringify(response);
	}

	if (!props.response.subquery || !response.subquery) return null;
	if (!routeData) return null;
	if (SchemaService.isCustomRouteData(routeData)) return null;

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsEditSubqueryPopup'}>
				<Box className={'header'}>
					<Label variant={'h4'} color={themes.neutralWhite} weight={'medium'}>
						Edit Subquery
					</Label>
					<Icon
						iconImg={'icon-close'}
						color={themes.neutralWhite}
						onClick={handleClose}
						cursorPointer
						p={4}
						fontSize={16}
					/>
				</Box>
				<Box className={'content'}>
					<BaseTableInput
						tableName={response.subquery.table || ''}
						onChange={(newTableName) => {
							if (!response.subquery) return;
							setResponse({ ...response, subquery: { ...response.subquery, table: newTableName } });
						}}
					/>
					<JoinTableInput
						routeData={routeData}
						baseTableName={response.subquery.table}
						joins={response.subquery.joins}
						onAddJoin={(join) => {
							if (!response.subquery) return;
							setResponse({
								...response,
								subquery: { ...response.subquery, joins: [...response.subquery.joins, join] }
							});
						}}
						onRemoveJoin={(joinIndex) => {
							if (!response.subquery) return;
							const newJoins = [...response.subquery.joins];
							newJoins.splice(joinIndex, 1);
							setResponse({ ...response, subquery: { ...response.subquery, joins: newJoins } });
						}}
						onUpdateJoin={(joinIndex, join) => {
							if (!response.subquery) return;
							const newJoins = [...response.subquery.joins];
							newJoins[joinIndex] = join;
							setResponse({ ...response, subquery: { ...response.subquery, joins: newJoins } });
						}}
					/>
					<WhereClauseInput
						routeData={routeData}
						baseTableName={response.subquery.table}
						where={response.subquery.where}
						onAddWhereClause={(whereClause) => {
							if (!response.subquery) return;
							setResponse({
								...response,
								subquery: { ...response.subquery, where: [...response.subquery.where, whereClause] }
							});
						}}
						onUpdateWhereClause={(whereIndex, whereClause) => {
							if (!response.subquery) return;
							const newWhere = [...response.subquery.where];
							newWhere[whereIndex] = whereClause;
							setResponse({ ...response, subquery: { ...response.subquery, where: newWhere } });
						}}
						onRemoveWhereClause={(whereIndex) => {
							if (!response.subquery) return;
							const newWhere = [...response.subquery.where];
							newWhere.splice(whereIndex, 1);
							setResponse({ ...response, subquery: { ...response.subquery, where: newWhere } });
						}}
					/>
					<GroupByInput
						baseTableName={response.subquery.table}
						joins={response.subquery.joins}
						groupBy={response.subquery.groupBy}
						onUpdate={(updatedGroupBy) => {
							if (!response.subquery) return;
							let updatedResponse = cloneDeep(response);
							if (!updatedResponse.subquery) return;
							if (!updatedGroupBy) {
								delete updatedResponse.subquery.groupBy;
							} else {
								updatedResponse.subquery.groupBy = updatedGroupBy;
							}
							setResponse(updatedResponse);
						}}
					/>
					<OrderByInput
						baseTableName={response.subquery.table}
						joins={response.subquery.joins}
						orderBy={response.subquery.orderBy}
						onUpdate={(updatedOrderBy) => {
							if (!response.subquery) return;
							let updatedResponse = cloneDeep(response);
							if (!updatedResponse.subquery) return;
							if (!updatedOrderBy) {
								delete updatedResponse.subquery.orderBy;
							} else {
								updatedResponse.subquery.orderBy = updatedOrderBy;
							}
							setResponse(updatedResponse);
						}}
					/>
					<Box display={'flex'} gap={16}>
						<Button look={'outlinedPrimary'} onClick={handleClose} fullWidth>
							Cancel
						</Button>
						<Button look={'containedPrimary'} onClick={handleSave} disabled={!isModified()} fullWidth>
							Save
						</Button>
					</Box>
				</Box>
			</Box>
		</Popup>
	);
};

export default EditSubqueryPopup;

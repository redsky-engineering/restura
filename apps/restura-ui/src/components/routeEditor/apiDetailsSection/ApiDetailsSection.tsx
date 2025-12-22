import { Box } from '@redskytech/framework/ui';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { useRecoilValue } from 'recoil';
import useRouteData from '../../../customHooks/useRouteData';
import SchemaService, { SelectedRoute } from '../../../services/schema/SchemaService';
import serviceFactory from '../../../services/serviceFactory.js';
import globalState from '../../../state/globalState.js';
import AssignmentInput from '../../assignmentInput/AssignmentInput.js';
import BaseTableInput from '../../baseTableInput/BaseTableInput';
import DeprecationInput from '../../deprecationInput/DeprecationInput';
import FileUploadInput from '../../fileUploadInput/FileUploadInput.js';
import GroupByInput from '../../groupByInput/GroupByInput';
import JoinTableInput from '../../joinTableInput/JoinTableInput';
import MethodPathInput from '../../methodPathInput/MethodPathInput';
import OrderByInput from '../../orderByInput/OrderByInput';
import PermissionInput from '../../permissionInput/PermissionInput';
import RequestParamInput from '../../requestParamInput/RequestParamInput';
import RouteDescriptionInput from '../../routeDescriptionInput/RouteDescriptionInput';
import RouteNameInput from '../../routeNameInput/RouteNameInput';
import RouteTypeInput from '../../routeTypeInput/RouteTypeInput';
import WhereClauseInput from '../../whereClauseInput/WhereClauseInput';
import './ApiDetailsSection.scss';

interface ApiDetailsSectionProps {}

const ApiDetailsSection: React.FC<ApiDetailsSectionProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);
	const routeData = useRouteData();

	if (!selectedRoute || !routeData) return <></>;

	function renderStandardRouteInputs() {
		// Inputs
		// Type, Name, Description, Permission, BaseTable, MethodPath, Assignment, RequestParam, JoinTable, WhereClause, GroupBy, OrderBy
		if (!SchemaService.isStandardRouteData(routeData)) return <></>;

		return (
			<>
				<RouteTypeInput routeData={routeData} />
				<RouteNameInput routeData={routeData} />
				<RouteDescriptionInput routeData={routeData} />
				<PermissionInput routeData={routeData} />
				<MethodPathInput routeData={routeData} />
				<DeprecationInput routeData={routeData} />
				<BaseTableInput
					tableName={routeData.table}
					onChange={(newTableName) => {
						schemaService.updateRouteData({
							...routeData,
							table: newTableName
						});
					}}
				/>
				<AssignmentInput routeData={routeData} />
				<RequestParamInput routeData={routeData} />
				<JoinTableInput
					routeData={routeData}
					joins={routeData.joins}
					baseTableName={routeData.table}
					onAddJoin={(join) => schemaService.addJoin(join)}
					onRemoveJoin={(joinIndex) => schemaService.removeJoin(joinIndex)}
					onUpdateJoin={(joinIndex, updatedJoinData) =>
						schemaService.updateJoinData(joinIndex, updatedJoinData)
					}
				/>
				<WhereClauseInput
					routeData={routeData}
					where={routeData.where}
					baseTableName={routeData.table}
					onAddWhereClause={(whereClause) => {
						schemaService.addWhereClause(whereClause);
					}}
					onRemoveWhereClause={(whereIndex) => {
						schemaService.removeWhereClause(whereIndex);
					}}
					onUpdateWhereClause={(whereIndex, updatedWhereData) => {
						schemaService.updateWhereData(whereIndex, updatedWhereData);
					}}
				/>
				<GroupByInput
					baseTableName={routeData.table}
					joins={routeData.joins}
					groupBy={routeData.groupBy}
					onUpdate={(updatedGroupBy) => {
						let updatedRouteData = cloneDeep(routeData);
						if (!updatedGroupBy) {
							delete updatedRouteData.groupBy;
							schemaService.updateRouteData(updatedRouteData);
						} else {
							updatedRouteData.groupBy = updatedGroupBy;
							schemaService.updateRouteData(updatedRouteData);
						}
					}}
				/>
				{routeData.type !== 'ONE' && (
					<OrderByInput
						baseTableName={routeData.table}
						joins={routeData.joins}
						orderBy={routeData.orderBy}
						onUpdate={(updatedOrderBy) => {
							let updatedRouteData = cloneDeep(routeData);
							if (!updatedOrderBy) {
								delete updatedRouteData.orderBy;
								schemaService.updateRouteData(updatedRouteData);
							} else {
								updatedRouteData.orderBy = updatedOrderBy;
								schemaService.updateRouteData(updatedRouteData);
							}
						}}
					/>
				)}
			</>
		);
	}

	function renderCustomRouteInputs() {
		// Inputs
		// Type, Name, Description, Permission, MethodPath, RequestParam
		if (!SchemaService.isCustomRouteData(routeData)) return <></>;
		return (
			<>
				<RouteTypeInput routeData={routeData} />
				<RouteNameInput routeData={routeData} />
				<RouteDescriptionInput routeData={routeData} />
				<PermissionInput routeData={routeData} />
				<MethodPathInput routeData={routeData} />
				<DeprecationInput routeData={routeData} />
				<RequestParamInput routeData={routeData} />
				<FileUploadInput routeData={routeData} />
			</>
		);
	}

	return (
		<Box className={'rsApiDetailsSection'}>
			{SchemaService.isStandardRouteData(routeData) ? renderStandardRouteInputs() : renderCustomRouteInputs()}
		</Box>
	);
};

export default ApiDetailsSection;

import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { ObjectUtils } from '../../utils/utils.js';

interface RouteTypeInputProps {
	routeData: Restura.RouteData | undefined;
}

const RouteTypeInput: React.FC<RouteTypeInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	const routeTypeOptions = useMemo(() => {
		return [
			{ label: 'One Item', value: 'ONE' },
			{ label: 'Array of Items', value: 'ARRAY' },
			{ label: 'Paginated List', value: 'PAGED' },
			{ label: 'Custom One Item', value: 'CUSTOM_ONE' },
			{ label: 'Custom Array', value: 'CUSTOM_ARRAY' },
			{ label: 'Custom Paged', value: 'CUSTOM_PAGED' }
		];
	}, []);

	if (!props.routeData) return null;

	return (
		<Box className={'rsRouteTypeInput'}>
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Type
				</Label>
				<Select
					value={routeTypeOptions.find((item) => item.value === props.routeData!.type)}
					options={routeTypeOptions}
					onChange={(newValue) => {
						if (!newValue) return;
						let updatedRouteData = { ...props.routeData! };

						if (
							SchemaService.isCustomRouteData(props.routeData) &&
							['ONE', 'ARRAY', 'PAGED'].includes(newValue.value)
						) {
							// We are switching from custom to standard
							delete (updatedRouteData as any).responseType;
							delete (updatedRouteData as any).requestType;
							delete (updatedRouteData as any).fileUploadType;
							(updatedRouteData as Restura.StandardRouteData).joins = [];
							(updatedRouteData as Restura.StandardRouteData).assignments = [];
							(updatedRouteData as Restura.StandardRouteData).where = [];
							(updatedRouteData as Restura.StandardRouteData).request = [];
							(updatedRouteData as Restura.StandardRouteData).response = [];
							(updatedRouteData as Restura.StandardRouteData).table = '';
						} else if (
							SchemaService.isStandardRouteData(props.routeData) &&
							['CUSTOM_ONE', 'CUSTOM_ARRAY', 'CUSTOM_PAGED'].includes(newValue.value)
						) {
							// We are switching from standard to custom
							(updatedRouteData as Restura.CustomRouteData).responseType = 'boolean';
							delete (updatedRouteData as any).requestType;
							delete (updatedRouteData as any).fileUploadType;
							delete (updatedRouteData as any).joins;
							delete (updatedRouteData as any).assignments;
							delete (updatedRouteData as any).where;
							delete (updatedRouteData as any).request;
							delete (updatedRouteData as any).response;
							delete (updatedRouteData as any).table;
						}

						if (newValue.value !== 'PAGED') {
							updatedRouteData.request = updatedRouteData.request?.filter(
								(request) =>
									!['page', 'perPage', 'filter', 'sortBy', 'sortOrder'].includes(request.name)
							);
						}

						if (newValue.value === 'ONE') {
							delete (updatedRouteData as Restura.StandardRouteData).orderBy;
						} else if (
							newValue.value === 'CUSTOM_ONE' ||
							newValue.value === 'CUSTOM_ARRAY' ||
							newValue.value === 'CUSTOM_PAGED'
						) {
							if (SchemaService.isStandardRouteData(updatedRouteData)) {
								updatedRouteData = {
									type: newValue.value,
									responseType: 'boolean',
									request: updatedRouteData.request,
									method: updatedRouteData.method,
									name: updatedRouteData.name,
									description: updatedRouteData.description,
									path: updatedRouteData.path,
									roles: updatedRouteData.roles
								};
							}
						} else if (newValue.value === 'PAGED') {
							let pagedParams: Restura.RequestData[] = [];
							if (!updatedRouteData.request?.find((route) => route.name === 'page')) {
								pagedParams = [
									{
										name: 'page',
										required: false,
										validator: [{ type: 'TYPE_CHECK', value: 'number' }]
									},
									{
										name: 'perPage',
										required: false,
										validator: [{ type: 'TYPE_CHECK', value: 'number' }]
									},
									{
										name: 'filter',
										required: false,
										validator: [{ type: 'TYPE_CHECK', value: 'string' }]
									},
									{
										name: 'sortBy',
										required: false,
										validator: [{ type: 'TYPE_CHECK', value: 'string' }]
									},
									{
										name: 'sortOrder',
										required: false,
										validator: [{ type: 'ONE_OF', value: ['ASC', 'DESC', 'NONE', 'RAND'] }]
									}
								];
							}
							delete (updatedRouteData as Restura.StandardRouteData).orderBy;
							updatedRouteData = {
								...updatedRouteData,
								table: (updatedRouteData as Restura.StandardRouteData).table,
								type: newValue.value,
								request: ObjectUtils.isArrayWithData(updatedRouteData.request)
									? [...pagedParams, ...updatedRouteData.request]
									: pagedParams,
								response: (updatedRouteData as Restura.StandardRouteData).response,
								assignments: (updatedRouteData as Restura.StandardRouteData).assignments,
								where: (updatedRouteData as Restura.StandardRouteData).where,
								joins: (updatedRouteData as Restura.StandardRouteData).joins,
								roles: updatedRouteData.roles
							};
						}

						schemaService.updateRouteData({
							...updatedRouteData,
							type: newValue.value as Restura.StandardRouteData['type']
						} as Restura.StandardRouteData);
					}}
				/>
			</Box>
		</Box>
	);
};

export default RouteTypeInput;

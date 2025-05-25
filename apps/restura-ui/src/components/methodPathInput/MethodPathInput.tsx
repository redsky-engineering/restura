import { Box, InputText, Label, rsToastify, Select } from '@redskytech/framework/ui';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import SchemaService, { SelectedRoute } from '../../services/schema/SchemaService';
import serviceFactory from '../../services/serviceFactory';
import globalState from '../../state/globalState';
import themes from '../../themes/themes.scss?export';
import './MethodPathInput.scss';

interface MethodPathInputProps {
	routeData: Restura.RouteData | undefined;
}

const MethodPathInput: React.FC<MethodPathInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [selectedRoute, setSelectedRoute] = useRecoilState<SelectedRoute | undefined>(globalState.selectedRoute);
	const [routePath, setRoutePath] = useState<string>('');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	useEffect(() => {
		if (!selectedRoute) return;
		setRoutePath(selectedRoute.path);
	}, [selectedRoute]);

	if (!props.routeData || !selectedRoute) return <></>;

	function isDuplicate(path: string, method: string): boolean {
		if (!selectedRoute) return false;
		let endpointIndex = schema!.endpoints.findIndex((item) => item.baseUrl === selectedRoute.baseUrl);
		if (endpointIndex === -1) {
			rsToastify.error(`Endpoints with base url ${selectedRoute.baseUrl} not found`, 'Invalid Base Url');
			return true;
		}
		let routeIndex = schema!.endpoints[endpointIndex].routes.findIndex((item) => {
			return item.path === path && item.method === method;
		});
		if (routeIndex !== -1) {
			rsToastify.error(`Route with path ${path} and method ${method} already exists`, 'Duplicate Route');
			return true;
		}
		return false;
	}

	return (
		<Box className={'rsMethodPathInput'}>
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Method
				</Label>
				<Select
					value={{ label: props.routeData.method, value: props.routeData.method }}
					options={[
						{
							label: 'GET',
							value: 'GET'
						},
						{
							label: 'POST',
							value: 'POST'
						},
						{
							label: 'PUT',
							value: 'PUT'
						},
						{
							label: 'PATCH',
							value: 'PATCH'
						},
						{
							label: 'DELETE',
							value: 'DELETE'
						}
					]}
					onChange={(newValue) => {
						if (!newValue || !props.routeData) return;
						// Check if they didn't change anything
						if (newValue.value === selectedRoute.method) return;

						if (isDuplicate(props.routeData.path, newValue.value)) return;

						// Handle the case where we are changing the method on a custom route to one that doesn't support file upload.
						const updatedRouteData = { ...props.routeData, method: newValue.value };
						if (SchemaService.isCustomRouteData(updatedRouteData)) {
							if (newValue.value === 'GET' || newValue.value === 'DELETE') {
								delete updatedRouteData.fileUploadType;
							}
						}
						schemaService.updateRouteData(updatedRouteData);
						setSelectedRoute({ ...selectedRoute, method: newValue.value });
					}}
				/>
			</Box>
			<Box flexGrow={1}>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Path <span style={{ color: themes.neutralBeige600 }}>(/api/v1)</span>
				</Label>
				<InputText
					inputMode={'url'}
					placeholder={'/path'}
					value={routePath}
					onChange={(value) => {
						setRoutePath(value);
					}}
					onBlur={(event) => {
						if (!props.routeData) return;

						let newPath = event.target.value;
						if (!newPath.startsWith('/')) newPath = '/' + newPath;
						if (newPath.endsWith('/')) newPath = newPath.slice(0, -1);

						// Check if they didn't change anything
						if (newPath === selectedRoute.path) return;

						if (isDuplicate(newPath, props.routeData.method)) return;

						schemaService.updateRouteData({ ...props.routeData, path: newPath });
						setSelectedRoute({ ...selectedRoute, path: newPath });
					}}
				/>
			</Box>
		</Box>
	);
};

export default MethodPathInput;

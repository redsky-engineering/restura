import * as React from 'react';
import './EndpointListMenu.scss';
import { Box, Button, Icon, InputText, Label, popupController, rsToastify } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useRecoilState } from 'recoil';
import globalState from '../../state/globalState.js';
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import { SelectedRoute } from '../../services/schema/SchemaService';
import ConfirmationPopup, { ConfirmationPopupProps } from '../../popups/confirmationPopup/ConfirmationPopup';

interface EndpointListMenuProps {}

const EndpointListMenu: React.FC<EndpointListMenuProps> = (props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);
	const [selectedRoute, setSelectedRoute] = useRecoilState<SelectedRoute | undefined>(globalState.selectedRoute);
	const [filterValue, setFilterValue] = useState<string>('');

	useEffect(() => {
		// Auto select first route if none selected
		if (!schema || selectedRoute) return;
		if (schema.endpoints.length > 0 && schema.endpoints[0].routes.length > 0) {
			let firstRouteAlphabetically = schema.endpoints[0].routes
				.slice()
				.sort((a, b) => a.path.localeCompare(b.path))[0];
			setSelectedRoute({
				baseUrl: schema.endpoints[0].baseUrl,
				path: firstRouteAlphabetically.path,
				method: firstRouteAlphabetically.method
			});
		}
	}, [schema]);

	function handleAddNewRoute() {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let currentEndpoint: Restura.EndpointData | undefined;
		if (selectedRoute)
			currentEndpoint = updatedSchema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		else currentEndpoint = updatedSchema.endpoints[0];
		if (!currentEndpoint) {
			rsToastify.error('Could not find any endpoints', 'Missing Endpoint');
			return;
		}

		let randomPath = '/new/' + Math.random().toString(36).substring(2, 6).toUpperCase();
		currentEndpoint.routes.push({
			method: 'GET',
			name: 'New Route',
			description: '',
			path: randomPath,
			roles: [],
			request: [],
			response: [],
			type: 'ONE',
			table: '',
			joins: [],
			where: [],
			assignments: []
		});
		setSchema(updatedSchema);
		setSelectedRoute({
			baseUrl: selectedRoute?.baseUrl || currentEndpoint.baseUrl,
			method: 'GET',
			path: randomPath
		});
	}

	function handleRemoveRoute(routeData: Restura.RouteData) {
		popupController.open<ConfirmationPopupProps>(ConfirmationPopup, {
			label: `Are you sure you want to this route (${routeData.method}:${routeData.path})`,
			headerLabel: 'Delete Route',
			acceptLabel: 'Delete',
			rejectLabel: 'Cancel',
			onAccept: () => {
				if (!schema || !selectedRoute) return;
				let updatedSchema = cloneDeep(schema);
				let currentEndpoint = updatedSchema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
				if (!currentEndpoint) return;

				if (routeData.path === selectedRoute.path && routeData.method === selectedRoute.method) {
					setSelectedRoute(undefined);
				}
				currentEndpoint.routes = currentEndpoint.routes.filter((item) => {
					return item.path !== routeData.path || item.method !== routeData.method;
				});
				setSchema(updatedSchema);
			}
		});
	}

	function handleDuplicateRoute(routeData: Restura.RouteData) {
		if (!schema || !selectedRoute) return;
		let updatedSchema = cloneDeep(schema);
		let currentEndpoint = updatedSchema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		if (!currentEndpoint) return;

		let newRoute = cloneDeep(routeData);
		newRoute.path += '/copy-' + Math.random().toString(36).substring(2, 6).toUpperCase();
		currentEndpoint.routes.push(newRoute);
		setSchema(updatedSchema);
		setSelectedRoute({ ...selectedRoute, method: newRoute.method, path: newRoute.path });
	}

	function renderHeader() {
		return (
			<Box className={'header'}>
				<Label variant={'subheader2'} weight={'semiBold'}>
					Endpoints
				</Label>
				<Button look={'containedPrimary'} small onClick={handleAddNewRoute}>
					New
				</Button>
			</Box>
		);
	}

	function renderFilter() {
		return (
			<Box className={'filter'}>
				<InputText
					placeholder={'Search'}
					inputMode={'search'}
					value={filterValue}
					onChange={(newValue) => {
						setFilterValue(newValue);
					}}
					icon={[
						{
							iconImg: 'icon-filter-list',
							fontSize: 16,
							position: 'RIGHT',
							color: themes.neutralBeige500,
							onClick: (event) => {
								event.stopPropagation();
								console.log('filter');
							},
							cursorPointer: true
						}
					]}
				/>
			</Box>
		);
	}

	function renderEndpoints() {
		if (!schema || !selectedRoute) return <></>;
		let endpoints = schema.endpoints.find((endpoint) => endpoint.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return <></>;
		return [...endpoints.routes]
			.sort((a, b) => a.path.localeCompare(b.path))
			.filter((route) => {
				if (filterValue === '') return true;
				return route.path.includes(filterValue);
			})
			.map((route) => {
				let isPublic = route.roles.length === 0;
				return (
					<Box
						key={`${route.method}_${route.path}`}
						className={classNames('endpoint', {
							isSelected: route.path === selectedRoute.path && route.method === selectedRoute.method
						})}
						onClick={() =>
							setSelectedRoute({ baseUrl: endpoints!.baseUrl, path: route.path, method: route.method })
						}
					>
						<Box className={'container'}>
							<Box>
								<Label variant={'caption1'} weight={'regular'} className={'path'}>
									{route.path}
								</Label>
								{isPublic && (
									<Label variant={'caption2'} weight={'regular'} className={'public'}>
										PUBLIC
									</Label>
								)}
							</Box>
							<Box display={'flex'} gap={8} alignItems={'center'}>
								<Label variant={'caption1'} weight={'regular'} className={'method'}>
									{route.method}
								</Label>
								<Icon
									iconImg={'icon-content-copy'}
									fontSize={16}
									cursorPointer
									onClick={(event) => {
										event.stopPropagation();
										handleDuplicateRoute(route);
									}}
								/>
								<Icon
									iconImg={'icon-delete'}
									fontSize={16}
									cursorPointer
									onClick={(event) => {
										event.stopPropagation();
										handleRemoveRoute(route);
									}}
								/>
							</Box>
						</Box>
					</Box>
				);
			});
	}

	return (
		<Box className={'rsEndpointListMenu'}>
			{renderHeader()}
			{renderFilter()}
			{renderEndpoints()}
			<Box className={'footer'} />
		</Box>
	);
};

export default EndpointListMenu;

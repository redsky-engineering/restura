import { Box, Label, Select } from '@redskytech/framework/ui';
import * as React from 'react';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import SchemaService from '../../services/schema/SchemaService';
import serviceFactory from '../../services/serviceFactory';
import globalState from '../../state/globalState';
import './PermissionInput.scss';

interface PermissionInputProps {
	routeData: Restura.RouteData | undefined;
}

const PermissionInput: React.FC<PermissionInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const roles = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.roles;
	}, [schema]);

	const scopes = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.scopes;
	}, [schema]);

	if (!props.routeData) return null;
	return (
		<Box className={'rsPermissionInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Permissions
			</Label>
			<Label variant={'caption1'} weight={'regular'} mb={4}>
				If all is empty, the endpoint is public. If using roles the requester must have the role. If using
				scopes the requester must have all the scopes.
			</Label>
			<Box display={'grid'} gridTemplateColumns={'80px 1fr'} mb={16} alignItems={'center'}>
				<Label variant={'body1'} weight={'regular'}>
					Roles
				</Label>
				<Select
					isMulti={true}
					closeMenuOnSelect={false}
					value={props.routeData.roles.map((item) => {
						return { label: item, value: item };
					})}
					options={roles.map((role) => {
						return { label: role, value: role };
					})}
					onChange={(newValue) => {
						if (!newValue) return;
						schemaService.updateRouteData({
							...props.routeData!,
							roles: newValue.map((item) => item.value)
						});
					}}
				/>
			</Box>
			<Box display={'grid'} gridTemplateColumns={'80px 1fr'} alignItems={'center'}>
				<Label variant={'body1'} weight={'regular'}>
					Scopes
				</Label>
				<Select
					isMulti={true}
					closeMenuOnSelect={false}
					value={props.routeData.scopes.map((item) => {
						return { label: item, value: item };
					})}
					options={scopes.map((scope) => {
						return { label: scope, value: scope };
					})}
					onChange={(newValue) => {
						if (!newValue) return;
						schemaService.updateRouteData({
							...props.routeData!,
							scopes: newValue.map((item) => item.value)
						});
					}}
				/>
			</Box>
		</Box>
	);
};

export default PermissionInput;

import * as React from 'react';
import { Box, InputText, Label } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService, { SelectedRoute } from '../../services/schema/SchemaService';
import globalState from '../../state/globalState';
import { useRecoilValue } from 'recoil';

interface RouteNameInputProps {
	routeData: Restura.RouteData | undefined;
}

const RouteNameInput: React.FC<RouteNameInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);

	if (!props.routeData || !selectedRoute) return <></>;

	return (
		<Box className={'rsRouteNameInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Name
			</Label>
			<InputText
				inputMode={'text'}
				placeholder={'descriptive name'}
				value={props.routeData.name}
				onChange={(value) => {
					schemaService.updateRouteData({ ...props.routeData!, name: value });
				}}
			/>
		</Box>
	);
};

export default RouteNameInput;

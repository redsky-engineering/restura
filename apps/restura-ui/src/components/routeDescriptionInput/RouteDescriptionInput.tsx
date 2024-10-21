import * as React from 'react';
import { Box, InputText, InputTextarea, Label } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface RouteDescriptionInputProps {
	routeData: Restura.RouteData | undefined;
}

const RouteDescriptionInput: React.FC<RouteDescriptionInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	if (!props.routeData) return <></>;

	return (
		<Box className={'rsRouteNameInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Description
			</Label>
			<InputTextarea
				inputMode={'text'}
				placeholder={'description...'}
				value={props.routeData.description}
				onChange={(value) => {
					schemaService.updateRouteData({ ...props.routeData!, description: value });
				}}
			/>
		</Box>
	);
};

export default RouteDescriptionInput;

import { Box, Checkbox, InputText, Label } from '@redskytech/framework/ui';
import * as React from 'react';
import { useRecoilValue } from 'recoil';
import SchemaService from '../../services/schema/SchemaService';
import serviceFactory from '../../services/serviceFactory';
import globalState from '../../state/globalState';
import themes from '../../themes/themes.scss?export';
import './DeprecationInput.scss';

interface PermissionInputProps {
	routeData: Restura.RouteData | undefined;
}

const DeprecationInput: React.FC<PermissionInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	if (!props.routeData) return null;
	return (
		<Box className={'rsDeprecationInput'}>
			<Box display={'flex'} alignItems={'center'} justifyContent={'space-between'}>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Deprecation
				</Label>
				<Checkbox
					labelText={'Is Deprecated'}
					look={'containedPrimary'}
					checked={props.routeData.deprecation?.date ? true : false}
					onChange={(event) => {
						if (!schema || !props.routeData) return;

						const updatedRouteData: Restura.RouteData = { ...props.routeData };
						if (event.target.checked) {
							updatedRouteData.deprecation = {
								date: new Date().toISOString()
							};
						} else {
							delete updatedRouteData.deprecation;
						}
						schemaService.updateRouteData(updatedRouteData);
					}}
				/>
			</Box>

			{props.routeData.deprecation?.date && (
				<Label variant={'body1'} weight={'regular'} mb={4}>
					<span style={{ color: themes.neutralBeige600 }}>
						{`${new Date(props.routeData.deprecation.date).toLocaleDateString()} ${new Date(props.routeData.deprecation.date).toLocaleTimeString()}`}
					</span>
				</Label>
			)}

			{props.routeData.deprecation !== undefined && (
				<InputText
					inputMode={'text'}
					placeholder={'Header response message'}
					value={props.routeData.deprecation?.message ?? ''}
					onChange={(value) => {
						if (!schema || !props.routeData) return;
						const updatedRouteData: Restura.RouteData = { ...props.routeData };

						if (updatedRouteData.deprecation) {
							updatedRouteData.deprecation = {
								...updatedRouteData.deprecation,
								message: value.length > 0 ? value : undefined
							};
							schemaService.updateRouteData(updatedRouteData);
						}
					}}
				/>
			)}
		</Box>
	);
};

export default DeprecationInput;

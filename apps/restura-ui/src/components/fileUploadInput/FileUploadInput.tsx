import { Box } from '@redskytech/framework/ui/box/Box.js';
import { Label } from '@redskytech/framework/ui/label/Label.js';
import { Select } from '@redskytech/framework/ui/select/Select.js';
import * as React from 'react';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import useRouteData from '../../customHooks/useRouteData.js';
import type { SelectedRoute } from '../../services/schema/SchemaService.js';
import SchemaService from '../../services/schema/SchemaService.js';
import serviceFactory from '../../services/serviceFactory.js';
import globalState from '../../state/globalState.js';
import './FileUploadInput.scss';

interface FileUploadInputProps {
	routeData: Restura.RouteData | undefined;
}

const FileUploadInput: React.FC<FileUploadInputProps> = (props: FileUploadInputProps) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);
	const routeData = useRouteData();

	const fileUploadOptions = useMemo<{ label: string; value: string }[]>(() => {
		return ['none', 'single', 'multiple'].map((item) => ({ label: item, value: item.toUpperCase() }));
	}, []);

	if (!selectedRoute || !routeData) return <></>;

	if (!props.routeData) return null;

	// Check if we are a custom route
	if (!SchemaService.isCustomRouteData(routeData)) console.log('Not a custom route');
	if (!SchemaService.isCustomRouteData(routeData)) return <></>;

	return (
		<Box className={'rsFileUploadInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				File Upload
			</Label>
			<Select
				options={fileUploadOptions}
				value={{
					label: routeData.fileUploadType?.toLowerCase() ?? 'none',
					value: routeData.fileUploadType?.toUpperCase() ?? 'NONE'
				}}
				onChange={(value) => {
					if (!value) return;
					schemaService.updateFileUploadType(value.value as Restura.CustomRouteData['fileUploadType']);
				}}
			/>
		</Box>
	);
};

export default FileUploadInput;

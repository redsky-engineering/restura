import * as React from 'react';
import './RawDataSection.scss';
import { Box, Button, rsToastify } from '@redskytech/framework/ui';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState';
import type JSONEditor from 'jsoneditor';
import type { JSONEditorOptions } from 'jsoneditor';
import serviceFactory from '../../../services/serviceFactory';
import SchemaService, { SelectedRoute } from '../../../services/schema/SchemaService';
import useRouteData from '../../../customHooks/useRouteData';

interface RawDataSectionProps {}

let editor: JSONEditor | null = null;

const RawDataSection: React.FC<RawDataSectionProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);
	const [initialRouteDataText, setInitialRouteDataText] = useState<string>('');
	const [currentRouteDataText, setCurrentRouteDataText] = useState<string>('');

	const routeData = useRouteData();

	useEffect(() => {
		if (editor) return; // only initialize once

		// create the editor
		const container = document.getElementById('jsoneditor');
		if (!container) return;
		const options: JSONEditorOptions = {
			mode: 'code',
			theme: 'ace/theme/dracula',
			modes: ['code', 'form', 'text', 'tree', 'view', 'preview'], // allowed modes
			onChange: () => {
				if (!editor) return;
				setCurrentRouteDataText(editor.getText());
			}
		};
		// @ts-ignore
		editor = new JSONEditor(container, options);
		if (routeData) editor.set(routeData);
		setInitialRouteDataText(editor.getText());
		setCurrentRouteDataText(editor.getText());
		editor.getText();
		return () => {
			if (!editor) return;
			editor.destroy();
			editor = null;
		};
	}, []);

	useEffect(() => {
		if (!editor) return;
		if (routeData) editor.set(routeData);
	}, [routeData]);

	if (!selectedRoute) return null;

	return (
		<Box className={'rsRawDataSection'}>
			<Box display={'flex'} gap={16} mb={16}>
				<Button
					look={'outlinedPrimary'}
					disabled={currentRouteDataText === initialRouteDataText}
					onClick={() => {
						if (!editor) return;
						editor?.setText(initialRouteDataText);
						setCurrentRouteDataText(initialRouteDataText);
					}}
				>
					Reset
				</Button>
				<Button
					look={'containedPrimary'}
					disabled={currentRouteDataText === initialRouteDataText}
					onClick={() => {
						if (!editor) return;
						try {
							let newRouteData = editor.get() as Restura.RouteData;
							schemaService.updateRouteData(newRouteData);
						} catch (e) {
							rsToastify.error('Invalid JSON, please fix the errors and try again', 'Invalid JSON');
						}
					}}
				>
					Apply
				</Button>
			</Box>
			<Box height={'calc(100vh - 225px)'} id={'jsoneditor'} />
		</Box>
	);
};

export default RawDataSection;

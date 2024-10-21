import * as React from 'react';
import './CodeGenSection.scss';
import { Box, Button, rsToastify } from '@redskytech/framework/ui';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState';
import serviceFactory from '../../../services/serviceFactory';
import SchemaService, { SelectedRoute } from '../../../services/schema/SchemaService';
import useRouteData from '../../../customHooks/useRouteData';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-min-noconflict/ext-searchbox';
import { StringUtils } from '../../../utils/utils';

interface CodeGenSectionProps {}

const CodeGenSection: React.FC<CodeGenSectionProps> = (props) => {
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const [codeGenText, setCodeGenText] = useState('');

	const routeData = useRouteData();

	function generateCode() {
		if (!routeData || !schema) {
			setCodeGenText('');
			return;
		}

		const requestData: string[] = [];

		if (routeData.request) {
			routeData.request.forEach((item) => {
				requestData.push(item.name);
			});
		} else if (SchemaService.isCustomRouteData(routeData)) {
			let responsePreviewText = SchemaService.getInterfaceFromCustomTypes(
				routeData.requestType || '',
				schema.customTypes
			);
			responsePreviewText.split('\n').forEach((item) => {
				// perform a regex and check if this is a key : value line
				let matches = item.match(/(\w+)(?=:)/);
				if (matches && matches.length > 0) {
					requestData.push(matches[0]);
				}
			});
		}

		// Todo: add support for other code gen types

		// Create a curl command from the route data
		const fullpath = `http://localhost:3001${schema.endpoints[0].baseUrl}${routeData.path}`;
		if (['DELETE', 'GET'].includes(routeData.method)) {
			let queryParams: string[] = [];
			requestData.forEach((item, index) => {
				queryParams.push(`${item}=value_${index}`);
			});
			setCodeGenText(
				`curl -X ${routeData.method} ${fullpath}${queryParams.length > 0 ? '?' + queryParams.join('&') : ''}`
			);
		} else if (['POST', 'PATCH', 'PUT'].includes(routeData.method)) {
			let bodyParams: string[] = [];
			requestData.forEach((item) => {
				bodyParams.push(`        "${item}" : ""`);
			});
			let bodyJsonStr = `{\n${bodyParams.join(',\n')}\n    }`;
			let curlCommands: string[] = [];
			curlCommands.push(`curl --request ${routeData.method} \\`);
			curlCommands.push(`    --url ${fullpath} \\`);
			curlCommands.push(`    --header 'x-auth-token: {{token}}' \\`);
			curlCommands.push(`    --header 'Content-Type: application/json' \\`);
			curlCommands.push(`    --data '${bodyJsonStr}'`);
			setCodeGenText(curlCommands.join('\n'));
		}
	}

	useEffect(() => {
		generateCode();
	}, [routeData, schema, selectedRoute]);

	function handleCopyToClipboard() {
		StringUtils.copyToClipboard(codeGenText);
		rsToastify.success('Copied to clipboard');
	}

	if (!selectedRoute) return null;

	return (
		<Box className={'rsCodeGenSection'}>
			<Button look="containedPrimary" onClick={handleCopyToClipboard} mb={16}>
				Copy To Clipboard
			</Button>
			<AceEditor
				width={'100%'}
				fontSize={14}
				height={'calc(100vh - 225px)'}
				mode="sh"
				theme="terminal"
				name="CustomType"
				editorProps={{ $blockScrolling: true }}
				value={codeGenText}
				readOnly
				highlightActiveLine={false}
			/>
		</Box>
	);
};

export default CodeGenSection;

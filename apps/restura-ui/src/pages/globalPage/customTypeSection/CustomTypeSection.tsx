import { Box } from '@redskytech/framework/ui';
import * as React from 'react';

import AceEditor from 'react-ace';

import 'ace-builds/src-min-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';

import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';

interface CustomTypeSectionProps {}

const CustomTypeSection: React.FC<CustomTypeSectionProps> = (_props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);

	function splitTopLevelDefinitions(typeString: string): string[] {
		const splitRegex = /(?=^export\s+(?:interface|type|class)\s+)/gm;

		return typeString
			.split(splitRegex)
			.map((item) => item.trim())
			.filter(Boolean);
	}

	function onChange(newValue: string) {
		if (!schema) return;
		setSchema({ ...schema, customTypes: splitTopLevelDefinitions(newValue) });
	}

	if (!schema) return <></>;

	return (
		<Box className={'rsCustomTypeSection'}>
			<AceEditor
				width={'100%'}
				fontSize={14}
				height={'calc(100vh - 200px)'}
				mode="typescript"
				theme="terminal"
				onChange={onChange}
				name="CustomType"
				editorProps={{ $blockScrolling: true }}
				value={schema.customTypes.join('\n\n')}
				enableBasicAutocompletion
				enableLiveAutocompletion
			/>
		</Box>
	);
};

export default CustomTypeSection;

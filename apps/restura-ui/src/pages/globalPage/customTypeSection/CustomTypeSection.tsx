import * as React from 'react';
import { Box } from '@redskytech/framework/ui';

import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-min-noconflict/ext-searchbox';

import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';

interface CustomTypeSectionProps {}

const CustomTypeSection: React.FC<CustomTypeSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);

	function onChange(newValue: string) {
		if (!schema) return;
		setSchema({ ...schema, customTypes: newValue });
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
				value={schema.customTypes}
				enableBasicAutocompletion
				enableLiveAutocompletion
			/>
		</Box>
	);
};

export default CustomTypeSection;

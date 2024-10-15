import * as React from 'react';
import './RouteEditor.scss';
import { Box, Label } from '@redskytech/framework/ui';
import { useRecoilState } from 'recoil';
import globalState, { EditMode } from '../../state/globalState.js';
import classNames from 'classnames';
import ApiDetailsSection from './apiDetailsSection/ApiDetailsSection.js';
import ResponseSection from './responseSection/ResponseSection.js';
import RawDataSection from './rawDataSection/RawDataSection.js';
import CodeGenSection from './codeGenSection/CodeGenSection.js';

interface RouteEditorProps {}

const RouteEditor: React.FC<RouteEditorProps> = (props) => {
	const [editMode, setEditMode] = useRecoilState<EditMode>(globalState.editMode);

	function renderTabHeader() {
		return (
			<Box className={'tabHeader'}>
				<Box
					className={classNames('tab', { isSelected: editMode === 'API_DETAILS' })}
					onClick={() => setEditMode('API_DETAILS')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						API Details
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: editMode === 'RESPONSE' })}
					onClick={() => setEditMode('RESPONSE')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Response
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: editMode === 'RAW_DATA' })}
					onClick={() => setEditMode('RAW_DATA')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Raw Data
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: editMode === 'CODE_GEN' })}
					onClick={() => setEditMode('CODE_GEN')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Code Gen
					</Label>
				</Box>
			</Box>
		);
	}

	return (
		<Box className={'rsRouteEditor'}>
			{renderTabHeader()}
			{editMode === 'API_DETAILS' && <ApiDetailsSection />}
			{editMode === 'RESPONSE' && <ResponseSection />}
			{editMode === 'RAW_DATA' && <RawDataSection />}
			{editMode === 'CODE_GEN' && <CodeGenSection />}
		</Box>
	);
};

export default RouteEditor;

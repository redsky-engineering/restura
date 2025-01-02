import { Box, Button, Img } from '@redskytech/framework/ui';
import classNames from 'classnames';
import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import useWarnOnUnsavedChanges from '../../customHooks/useWarnOnUnsavedChanges.js';
import adminLogo from '../../images/redsky_logo.png?webp&imagetools';
import SchemaService from '../../services/schema/SchemaService.js';
import serviceFactory from '../../services/serviceFactory.js';
import globalState from '../../state/globalState';
import SchemaPreview from '../schemaPreview/SchemaPreview';
import './AppBar.scss';

const AppBar: React.FC = () => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const [showPreview, setShowPreview] = useState<boolean>(false);

	useWarnOnUnsavedChanges(schemaService.isSchemaChanged(schema));

	return (
		<Box className={classNames('rsAppBar')}>
			<Box className="topName">
				<Img width={'auto'} height={32} src={adminLogo} alt="" disableImageKit />
			</Box>
			<Box display={'flex'} alignItems={'center'}>
				<Button
					look={'containedPrimary'}
					onClick={() => {
						setShowPreview(true);
					}}
					disabled={!schemaService.isSchemaChanged(schema)}
				>
					Preview Schema
				</Button>
			</Box>
			<SchemaPreview onClose={() => setShowPreview(false)} open={showPreview} />
		</Box>
	);
};

export default AppBar;

import * as React from 'react';
import './Paper.scss';
import { Box } from '@redskytech/framework/ui';

interface PaperProps {}

const Paper: React.FC<PaperProps> = (props) => {
	return <Box className={'rsPaper'}>{props.children}</Box>;
};

export default Paper;

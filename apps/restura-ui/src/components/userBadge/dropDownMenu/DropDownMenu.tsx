import * as React from 'react';
import './DropDownMenu.scss';
import { Box } from '@redskytech/framework/ui';

interface DropDownMenuProps {
	dropDownRef?: React.RefObject<any>;
}

const DropDownMenu: React.FC<DropDownMenuProps> = (props) => {
	return (
		<Box className={'rsDropDownMenu'} padding={10} elementRef={props.dropDownRef}>
			{props.children}
		</Box>
	);
};

export default DropDownMenu;

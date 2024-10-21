import * as React from 'react';
import './DropDownItem.scss';
import { Label, Box, Icon } from '@redskytech/framework/ui';

interface DropDownItemProps {
	title: string;
	iconImg?: string;
	onClick?: () => void;
}

const DropDownItem: React.FC<DropDownItemProps> = (props) => {
	return (
		<Box className={'rsDropDownItem'} display={'flex'} alignItems={'center'} onClick={props.onClick}>
			<Label variant={'body1'} weight={'medium'}>
				{props.title}
			</Label>
			{!!props.iconImg && <Icon iconImg={props.iconImg} color={'#ffffff'} />}
		</Box>
	);
};

export default DropDownItem;

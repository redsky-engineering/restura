import React, { useEffect, useState } from 'react';
import './MenuGroup.scss';
import themes from '../../../themes/themes.scss?export';
import classNames from 'classnames';
import { Accordion, Box, Icon, Label } from '@redskytech/framework/ui';

interface MenuGroupProps {
	name?: string;
	isChildSelected?: boolean;
	iconLeft?: string;
}

const MenuGroup: React.FC<MenuGroupProps> = (props) => {
	const [openSticky, setOpenSticky] = useState<boolean>(props.isChildSelected || false);
	useEffect(() => {
		if (props.isChildSelected) setOpenSticky(true);
	}, [props.isChildSelected]);

	return (
		<Box className={classNames('rsMenuGroup', { isChildSelected: props.isChildSelected })}>
			<Accordion
				title={
					<Box display={'flex'} alignItems={'center'}>
						<Icon
							iconImg={props.iconLeft || 'icon-folder'}
							color={props.isChildSelected ? themes.primaryRed500 : themes.neutralWhite}
							mr={8}
						/>
						<Label variant={'subtitle1'} weight={'medium'} color={themes.neutralWhite}>
							{props.name}
						</Label>
					</Box>
				}
				headerStyles={{
					bgColor: props.isChildSelected ? themes.neutralBlack : themes.neutralWhite50
				}}
				isOpen={openSticky}
				onClick={(isOpen) => {
					if (!isOpen) setOpenSticky(false);
				}}
			>
				{React.Children.map(props.children, (child) => {
					// @ts-ignore
					return React.cloneElement(child, {
						isNested: true
					});
				})}
			</Accordion>
		</Box>
	);
};

export default MenuGroup;

import React from 'react';
import './MenuItem.scss';
import classNames from 'classnames';
import router from '../../../utils/router';
import { Link } from '@redskytech/framework/996';
import { Label, Box, Icon } from '@redskytech/framework/ui';
import { RoutePaths } from '../../../routes.js';

interface MenuItemProps {
	name: string;
	path: RoutePaths;
	isSelected: boolean;
	isNested?: boolean;
	iconName?: string;
}
const MenuItem: React.FC<MenuItemProps> = (props) => {
	function handleNavigate() {
		if (window.location.pathname === props.path) return;
		router.navigate(props.path).catch(console.error);
	}

	return (
		<Link path={props.path} onClick={handleNavigate}>
			<Box className={classNames('rsMenuItem', { isSelected: props.isSelected, isNested: props.isNested })}>
				{props.iconName && <Icon iconImg={props.iconName} fontSize={16} />}
				<Label variant={'body1'} weight={'medium'}>
					{props.name}
				</Label>
			</Box>
		</Link>
	);
};

export default MenuItem;

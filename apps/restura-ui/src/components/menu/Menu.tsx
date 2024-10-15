import React, { useEffect, useState } from 'react';
import './Menu.scss';
import MenuItem from './menuItem/MenuItem';
import router from '../../utils/router';

import { Box, Icon, Label } from '@redskytech/framework/ui';
import classNames from 'classnames';
import serviceFactory from '../../services/serviceFactory';
import UserService from '../../services/user/UserService';

const Menu: React.FC = () => {
	const [currentPath, setCurrentPath] = useState<string>('');

	useEffect(() => {
		let id = router.subscribeToAfterRouterNavigate((path) => {
			setCurrentPath(path);
		});
		setCurrentPath(router.getCurrentPath());
		return () => {
			router.unsubscribeFromAfterRouterNavigate(id);
		};
	}, []);

	function isSelected(pathBase: string) {
		return currentPath.startsWith(pathBase);
	}

	function handleLogout() {
		const userService = serviceFactory.get<UserService>('UserService');
		userService.logout();
	}

	return (
		<Box className="rsMenu">
			<MenuItem
				isSelected={isSelected('/database')}
				name={'Database'}
				path={'/database'}
				iconName={'icon-home'}
			/>
			<MenuItem isSelected={isSelected('/endpoints')} name={'API'} path={'/endpoints'} iconName={'icon-store'} />
			<MenuItem isSelected={isSelected('/global')} name={'Global'} path={'/global'} iconName={'icon-globe'} />
			<Box className={classNames('rsMenuItem', 'logout')}>
				<Icon iconImg={'icon-logout'} fontSize={16} />
				<Label variant={'body1'} weight={'medium'} onClick={handleLogout}>
					Log Out
				</Label>
			</Box>
		</Box>
	);
};

export default Menu;

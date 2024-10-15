import React from 'react';
import '@redskytech/framework/index.css';
import './App.scss';
import './icons/style.css';

import Menu from './components/menu/Menu';
import useLoginState, { LoginStatus } from './customHooks/useLoginState';
import AppBar from './components/appBar/AppBar';
import { useLoadInitialPath } from './utils/router';
import { Box, popupController, rsToastify, ToastContainer } from '@redskytech/framework/ui';
import { View } from '@redskytech/framework/996';
import useIsAtBreakpoint from './customHooks/useIsAtBreakpoint';
import classNames from 'classnames';

function App() {
	const isSmallerThan1920 = useIsAtBreakpoint(1919);
	const isSmallerThan1440 = useIsAtBreakpoint(1439);
	const isSmallerThan1024 = useIsAtBreakpoint(1023);
	const isSmallerThan768 = useIsAtBreakpoint(767);
	const isSmallerThan425 = useIsAtBreakpoint(424);

	const loginStatus = useLoginState();
	useLoadInitialPath(loginStatus);

	function renderViewsBasedOnLoginStatus() {
		switch (loginStatus) {
			case LoginStatus.UNKNOWN:
				return null;
			case LoginStatus.LOGGED_OUT:
				return (
					<>
						<View key="login" id="login" default initialPath="/" />
					</>
				);
			case LoginStatus.LOGGED_IN:
				return (
					<div className="loggedInView">
						<AppBar />
						<Box display={'flex'}>
							<Menu />
							<View key="admin" id="admin" default initialPath="/database" />
						</Box>
					</div>
				);
		}
	}

	return (
		<Box
			className={classNames('App', {
				smallerThan1920: isSmallerThan1920,
				smallerThan1440: isSmallerThan1440,
				smallerThan1024: isSmallerThan1024,
				smallerThan768: isSmallerThan768,
				smallerThan425: isSmallerThan425
			})}
		>
			{renderViewsBasedOnLoginStatus()}
			{popupController.instance}
			<ToastContainer />
		</Box>
	);
}

export default App;

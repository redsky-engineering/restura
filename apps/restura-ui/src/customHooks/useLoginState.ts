import { useEffect, useState } from 'react';
import globalState, { clearPersistentState } from '../state/globalState';
import serviceFactory from '../services/serviceFactory';
import UserService from '../services/user/UserService.js';
import { useRecoilValue } from 'recoil';

export enum LoginStatus {
	UNKNOWN,
	LOGGED_OUT,
	LOGGED_IN
}

export default function useLoginState() {
	const [loginStatus, setLoginStatus] = useState<LoginStatus>(LoginStatus.UNKNOWN);
	const userService = serviceFactory.get<UserService>('UserService');
	const authToken = useRecoilValue(globalState.authToken);

	useEffect(() => {
		// Determine if our token is valid or not
		if (loginStatus === LoginStatus.UNKNOWN) return;

		if (!authToken) {
			setLoginStatus(LoginStatus.LOGGED_OUT);
		} else {
			setLoginStatus(LoginStatus.LOGGED_IN);
		}
	}, [loginStatus, authToken]);

	useEffect(() => {
		async function initialStartup() {
			if (!authToken) {
				setLoginStatus(LoginStatus.LOGGED_OUT);
				return;
			}

			try {
				await userService.loginUserByToken(authToken);
				setLoginStatus(LoginStatus.LOGGED_IN);
			} catch (e) {
				clearPersistentState();
				setLoginStatus(LoginStatus.LOGGED_OUT);
			}
		}
		initialStartup().catch(console.error);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return loginStatus;
}

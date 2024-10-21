import { useEffect } from 'react';
import { LoginStatus } from '../customHooks/useLoginState';
import { Router } from '@redskytech/framework/996';

class AdvancedRouter extends Router {
	constructor() {
		super({ animate: false });
	}
}

export function useLoadInitialPath(loginStatus: LoginStatus) {
	useEffect(() => {
		if (loginStatus === LoginStatus.UNKNOWN) return;
		router.tryToLoadInitialPath();
	}, [loginStatus]);
}

let router = new AdvancedRouter();
export default router;
(window as any).router = router;

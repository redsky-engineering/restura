import type { AuthenticateHandler } from '@restura/core';

const authenticationHandler: AuthenticateHandler = async (req, res, onValid) => {
	onValid({ role: 'admin', userId: 1, scopes: [] });
};
export default authenticationHandler;

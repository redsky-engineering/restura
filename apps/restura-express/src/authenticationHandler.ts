import type { AuthenticateHandler } from '@restura/core';

const authenticationHandler: AuthenticateHandler = async (_req, _res, onValid) => {
	onValid({ role: 'admin', userId: 1, scopes: ['read:user', 'write:user'] });
};
export default authenticationHandler;

import type { AuthenticateHandler } from '@restura/core';

const authenticationHandler: AuthenticateHandler = async (req, onValid, onReject) => {
	console.log(req.method);
	console.log(typeof onValid);
	console.log(typeof onReject);
	onValid({ role: 'admin' });
};
export default authenticationHandler;

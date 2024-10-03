import { RsRequest } from '@restura/core/src/restura/types/expressCustom';
import { RoleWithOptionalUserDetails } from '@restura/core/src/restura/types/restura.types';

const authenticationHandler = async (
	req: RsRequest<unknown>,
	onValid: (userDetails: RoleWithOptionalUserDetails) => void,
	onReject: (errorMessage: string) => void
) => {
	console.log(req.method);
	console.log(typeof onValid);
	console.log(typeof onReject);
	return;
};
export default authenticationHandler;

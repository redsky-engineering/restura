/* Note: We tried our best to find matching HTML codes for some of the things
   we are doing. However there isn't a perfect match because the HTML status
   codes were meant as a server signaling a client about some error either in the request
   and not the necessarily that a credit card was declined for example.
 */

// Internal data is used for passing around until we finally get to the sending externally
export interface RsErrorInternalData {
	err: ErrorCode;
	msg: string;
	stack: string;
	status: number;
	message?: string; // I don't think this is ever here
}

export enum HtmlStatusCodes {
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	METHOD_NOT_ALLOWED = 405,
	CONFLICT = 409,
	VERSION_OUT_OF_DATE = 418, // Technically this is the I'm a teapot code that was a joke.
	SERVER_ERROR = 500,
	SERVICE_UNAVAILABLE = 503,
	NETWORK_CONNECT_TIMEOUT = 599
}

export type ErrorCode =
	| 'UNKNOWN_ERROR'
	| 'NOT_FOUND'
	| 'EMAIL_TAKEN'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'CONFLICT'
	| 'UPDATE_FORBIDDEN'
	| 'CREATE_FORBIDDEN'
	| 'DELETE_FORBIDDEN'
	| 'DELETE_FAILURE'
	| 'BAD_REQUEST'
	| 'INVALID_TOKEN'
	| 'INCORRECT_EMAIL_OR_PASSWORD'
	| 'DUPLICATE_TOKEN'
	| 'DUPLICATE_USERNAME'
	| 'DUPLICATE_EMAIL'
	| 'DUPLICATE'
	| 'EMAIL_NOT_VERIFIED'
	| 'UPDATE_WITHOUT_ID'
	| 'CONNECTION_ERROR'
	| 'INVALID_PAYMENT'
	| 'DECLINED_PAYMENT'
	| 'INTEGRATION_ERROR'
	| 'CANNOT_RESERVE'
	| 'REFUND_FAILURE'
	| 'INVALID_INVOICE'
	| 'INVALID_COUPON'
	| 'SERVICE_UNAVAILABLE'
	| 'METHOD_UNALLOWED'
	| 'LOGIN_EXPIRED'
	| 'THIRD_PARTY_ERROR'
	| 'ACCESS_DENIED'
	| 'DATABASE_ERROR'
	| 'SCHEMA_ERROR';

export class RsError {
	err: ErrorCode;
	msg: string;
	status?: number;
	stack: string;

	constructor(errCode: ErrorCode, message?: string) {
		this.err = errCode;
		this.msg = message || '';
		this.status = RsError.htmlStatus(errCode);
		this.stack = new Error().stack || '';
	}

	static htmlStatus(code: ErrorCode): number {
		return htmlStatusMap[code];
	}
}

// MAKE SURE TO ADD A NEW ERROR TO BOTH THE LIST AND AN APPROPRIATE HTML CODE
// -- otherwise we default to error 500 --

const htmlStatusMap: Record<ErrorCode, number> = {
	UNKNOWN_ERROR: HtmlStatusCodes.SERVER_ERROR,
	NOT_FOUND: HtmlStatusCodes.NOT_FOUND,
	EMAIL_TAKEN: HtmlStatusCodes.CONFLICT,
	FORBIDDEN: HtmlStatusCodes.FORBIDDEN,
	CONFLICT: HtmlStatusCodes.CONFLICT,
	UNAUTHORIZED: HtmlStatusCodes.UNAUTHORIZED,
	UPDATE_FORBIDDEN: HtmlStatusCodes.FORBIDDEN,
	CREATE_FORBIDDEN: HtmlStatusCodes.FORBIDDEN,
	DELETE_FORBIDDEN: HtmlStatusCodes.FORBIDDEN,
	DELETE_FAILURE: HtmlStatusCodes.SERVER_ERROR,
	BAD_REQUEST: HtmlStatusCodes.BAD_REQUEST,
	INVALID_TOKEN: HtmlStatusCodes.UNAUTHORIZED,
	INCORRECT_EMAIL_OR_PASSWORD: HtmlStatusCodes.UNAUTHORIZED,
	DUPLICATE_TOKEN: HtmlStatusCodes.CONFLICT,
	DUPLICATE_USERNAME: HtmlStatusCodes.CONFLICT,
	DUPLICATE_EMAIL: HtmlStatusCodes.CONFLICT,
	DUPLICATE: HtmlStatusCodes.CONFLICT,
	EMAIL_NOT_VERIFIED: HtmlStatusCodes.BAD_REQUEST,
	UPDATE_WITHOUT_ID: HtmlStatusCodes.BAD_REQUEST,
	CONNECTION_ERROR: HtmlStatusCodes.NETWORK_CONNECT_TIMEOUT,
	INVALID_PAYMENT: HtmlStatusCodes.FORBIDDEN,
	DECLINED_PAYMENT: HtmlStatusCodes.FORBIDDEN,
	INTEGRATION_ERROR: HtmlStatusCodes.SERVER_ERROR,
	CANNOT_RESERVE: HtmlStatusCodes.FORBIDDEN,
	REFUND_FAILURE: HtmlStatusCodes.FORBIDDEN,
	INVALID_INVOICE: HtmlStatusCodes.FORBIDDEN,
	INVALID_COUPON: HtmlStatusCodes.FORBIDDEN,
	SERVICE_UNAVAILABLE: HtmlStatusCodes.SERVICE_UNAVAILABLE,
	METHOD_UNALLOWED: HtmlStatusCodes.METHOD_NOT_ALLOWED,
	LOGIN_EXPIRED: HtmlStatusCodes.UNAUTHORIZED,
	THIRD_PARTY_ERROR: HtmlStatusCodes.BAD_REQUEST,
	ACCESS_DENIED: HtmlStatusCodes.FORBIDDEN,
	DATABASE_ERROR: HtmlStatusCodes.SERVER_ERROR,
	SCHEMA_ERROR: HtmlStatusCodes.SERVER_ERROR
};

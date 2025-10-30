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
	PAYMENT_REQUIRED = 402,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	METHOD_NOT_ALLOWED = 405,
	REQUEST_TIMEOUT = 408,
	CONFLICT = 409,
	GONE = 410,
	PAYLOAD_TOO_LARGE = 413,
	UNSUPPORTED_MEDIA_TYPE = 415,
	UPGRADE_REQUIRED = 426,
	UNPROCESSABLE_ENTITY = 422,
	TOO_MANY_REQUESTS = 429,
	SERVER_ERROR = 500,
	NOT_IMPLEMENTED = 501,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
	GATEWAY_TIMEOUT = 504,
	NETWORK_CONNECT_TIMEOUT = 599
}

export type ErrorCode =
	// Generic HTTP status code equivalents (1:1 mapping)
	| 'BAD_REQUEST'
	| 'UNAUTHORIZED'
	| 'PAYMENT_REQUIRED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'METHOD_NOT_ALLOWED'
	| 'REQUEST_TIMEOUT'
	| 'CONFLICT'
	| 'GONE'
	| 'PAYLOAD_TOO_LARGE'
	| 'UNSUPPORTED_MEDIA_TYPE'
	| 'UPGRADE_REQUIRED'
	| 'UNPROCESSABLE_ENTITY'
	| 'TOO_MANY_REQUESTS'
	| 'SERVER_ERROR'
	| 'NOT_IMPLEMENTED'
	| 'BAD_GATEWAY'
	| 'SERVICE_UNAVAILABLE'
	| 'GATEWAY_TIMEOUT'
	| 'NETWORK_CONNECT_TIMEOUT'
	// Specific business logic errors
	| 'UNKNOWN_ERROR'
	| 'RATE_LIMIT_EXCEEDED'
	| 'INVALID_TOKEN'
	| 'INCORRECT_EMAIL_OR_PASSWORD'
	| 'DUPLICATE'
	| 'CONNECTION_ERROR'
	| 'SCHEMA_ERROR'
	| 'DATABASE_ERROR';

export class RsError {
	err: ErrorCode;
	msg: string;
	options?: Record<string, unknown>;
	status?: number;
	stack: string;

	constructor(errCode: ErrorCode, message?: string, options?: Record<string, unknown>) {
		this.err = errCode;
		this.msg = message || '';
		this.status = RsError.htmlStatus(errCode);
		this.stack = new Error().stack || '';
		this.options = options;
	}

	static htmlStatus(code: ErrorCode): number {
		return htmlStatusMap[code];
	}

	static isRsError(error: unknown): error is RsError {
		return error instanceof RsError;
	}
}

// MAKE SURE TO ADD A NEW ERROR TO BOTH THE LIST AND AN APPROPRIATE HTML CODE
// -- otherwise we default to error 500 --

const htmlStatusMap: Record<ErrorCode, number> = {
	// 1:1 mappings to HTTP status codes
	BAD_REQUEST: HtmlStatusCodes.BAD_REQUEST,
	UNAUTHORIZED: HtmlStatusCodes.UNAUTHORIZED,
	PAYMENT_REQUIRED: HtmlStatusCodes.PAYMENT_REQUIRED,
	FORBIDDEN: HtmlStatusCodes.FORBIDDEN,
	NOT_FOUND: HtmlStatusCodes.NOT_FOUND,
	METHOD_NOT_ALLOWED: HtmlStatusCodes.METHOD_NOT_ALLOWED,
	REQUEST_TIMEOUT: HtmlStatusCodes.REQUEST_TIMEOUT,
	CONFLICT: HtmlStatusCodes.CONFLICT,
	GONE: HtmlStatusCodes.GONE,
	PAYLOAD_TOO_LARGE: HtmlStatusCodes.PAYLOAD_TOO_LARGE,
	UNSUPPORTED_MEDIA_TYPE: HtmlStatusCodes.UNSUPPORTED_MEDIA_TYPE,
	UPGRADE_REQUIRED: HtmlStatusCodes.UPGRADE_REQUIRED,
	UNPROCESSABLE_ENTITY: HtmlStatusCodes.UNPROCESSABLE_ENTITY,
	TOO_MANY_REQUESTS: HtmlStatusCodes.TOO_MANY_REQUESTS,
	SERVER_ERROR: HtmlStatusCodes.SERVER_ERROR,
	NOT_IMPLEMENTED: HtmlStatusCodes.NOT_IMPLEMENTED,
	BAD_GATEWAY: HtmlStatusCodes.BAD_GATEWAY,
	SERVICE_UNAVAILABLE: HtmlStatusCodes.SERVICE_UNAVAILABLE,
	GATEWAY_TIMEOUT: HtmlStatusCodes.GATEWAY_TIMEOUT,
	NETWORK_CONNECT_TIMEOUT: HtmlStatusCodes.NETWORK_CONNECT_TIMEOUT,

	// Specific business errors mapped to appropriate HTTP codes
	UNKNOWN_ERROR: HtmlStatusCodes.SERVER_ERROR,
	RATE_LIMIT_EXCEEDED: HtmlStatusCodes.TOO_MANY_REQUESTS,
	INVALID_TOKEN: HtmlStatusCodes.UNAUTHORIZED,
	INCORRECT_EMAIL_OR_PASSWORD: HtmlStatusCodes.UNAUTHORIZED,
	DUPLICATE: HtmlStatusCodes.CONFLICT,
	CONNECTION_ERROR: HtmlStatusCodes.GATEWAY_TIMEOUT,
	SCHEMA_ERROR: HtmlStatusCodes.SERVER_ERROR,
	DATABASE_ERROR: HtmlStatusCodes.SERVER_ERROR
};

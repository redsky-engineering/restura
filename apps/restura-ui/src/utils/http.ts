import { AxiosError } from 'axios';
import { HttpClient } from '@redskytech/framework/utils';

export enum HttpStatusCode {
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	METHOD_NOT_ALLOWED = 405,
	ALREADY_EXISTS = 409,
	CONFLICT = 409,
	VERSION_OUT_OF_DATE = 418, // Technically this is the I'm a teapot code that was a joke.
	SERVER_ERROR = 500,
	SERVICE_UNAVAILABLE = 503,
	NETWORK_CONNECT_TIMEOUT = 599
}

const http = new HttpClient({
	baseURL: '/restura/v1',
	headers: {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		Accept: 'application/json, text/plain, */*',
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH'
	}
});

http.addRequestIntercepter(async (requestConfig) => {
	return requestConfig;
});

http.addResponseIntercepter(
	(response) => {
		return response;
	},
	(error) => {
		if (error.isAxiosError) {
			let axiosError = error as AxiosError;
			if (
				axiosError.response &&
				(axiosError.response.status === HttpStatusCode.UNAUTHORIZED ||
					axiosError.response.status === HttpStatusCode.FORBIDDEN)
			) {
				console.log('Received an forbidden, should probably logout user');
			}
		}
		throw error;
	}
);

export default http;

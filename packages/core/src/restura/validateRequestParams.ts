import { ObjectUtils } from '@redskytech/core-utils';
import jsonschema, { Schema } from 'jsonschema';
import type { DynamicObject, RsRequest } from './types/expressCustom.js';
import { Definition } from 'typescript-json-schema';
import { RequestData, RouteData } from './restura.schema';
import { RsError } from './errors';
import { z } from 'zod';
import { ValidatorData, ValidatorDataSchemeValue, validatorDataSchemeValue } from './types/validation.types';
import addQuotesToStrings from './utils/addQuotesToStrings';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

export default function validateRequestParams(
	req: RsRequest<DynamicObject>,
	routeData: RouteData,
	validationSchema: ValidationDictionary
) {
	const requestData = getRequestData(req as RsRequest<DynamicObject>);
	req.data = requestData;

	if (routeData.request === undefined) {
		if (routeData.type !== 'CUSTOM_ONE' && routeData.type !== 'CUSTOM_ARRAY' && routeData.type !== 'CUSTOM_PAGED')
			throw new RsError('BAD_REQUEST', `No request parameters provided for standard request.`);

		if (!routeData.responseType) throw new RsError('BAD_REQUEST', `No response type defined for custom request.`);

		if (!routeData.requestType) throw new RsError('BAD_REQUEST', `No request type defined for custom request.`);

		const currentInterface = validationSchema[routeData.requestType];
		const validator = new jsonschema.Validator();
		const executeValidation = validator.validate(req.data, currentInterface as Schema);
		if (!executeValidation.valid) {
			throw new RsError(
				'BAD_REQUEST',
				`Request custom setup has failed the following check: (${executeValidation.errors})`
			);
		}
		return;
	}

	// Make sure all passed in params are defined in the schema
	Object.keys(req.data).forEach((requestParamName) => {
		const requestParam = routeData.request!.find((param) => param.name === requestParamName);
		if (!requestParam) {
			throw new RsError('BAD_REQUEST', `Request param (${requestParamName}) is not allowed`);
		}
	});

	routeData.request.forEach((requestParam) => {
		// Find the request param in the request data
		const requestValue = requestData[requestParam.name];
		// If the request param is required and not found in the request data, throw an error
		if (requestParam.required && requestValue === undefined)
			throw new RsError('BAD_REQUEST', `Request param (${requestParam.name}) is required but missing`);
		else if (!requestParam.required && requestValue === undefined) return;

		validateRequestSingleParam(requestValue, requestParam);
	});
}

function validateRequestSingleParam(requestValue: unknown, requestParam: RequestData) {
	requestParam.validator.forEach((validator) => {
		switch (validator.type) {
			case 'TYPE_CHECK':
				performTypeCheck(requestValue, validator, requestParam.name);
				break;
			case 'MIN':
				performMinCheck(requestValue, validator, requestParam.name);
				break;
			case 'MAX':
				performMaxCheck(requestValue, validator, requestParam.name);
				break;
			case 'ONE_OF':
				performOneOfCheck(requestValue, validator, requestParam.name);
				break;
		}
	});
}

function isValidType(type: ValidatorDataSchemeValue, requestValue: unknown): boolean {
	try {
		expectValidType(type, requestValue);
		return true;
	} catch {
		return false;
	}
}

function expectValidType(type: ValidatorDataSchemeValue, requestValue: unknown) {
	if (type === 'number') {
		return z.number().parse(requestValue);
	}
	if (type === 'string') {
		return z.string().parse(requestValue);
	}
	if (type === 'boolean') {
		return z.boolean().parse(requestValue);
	}
	if (type === 'string[]') {
		return z.array(z.string()).parse(requestValue);
	}
	if (type === 'number[]') {
		return z.array(z.number()).parse(requestValue);
	}
	if (type === 'any[]') {
		return z.array(z.any()).parse(requestValue);
	}
	if (type === 'object') {
		return z.object({}).strict().parse(requestValue);
	}
}

export function performTypeCheck(requestValue: unknown, validator: ValidatorData, requestParamName: string) {
	if (!isValidType(validator.value, requestValue)) {
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${addQuotesToStrings(requestValue)}) is not of type (${validator.value})`
		);
	}
	try {
		validatorDataSchemeValue.parse(validator.value);
	} catch {
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validator.value}) is not a valid type`);
	}
}

function expectOnlyNumbers(requestValue: unknown, validator: ValidatorData, requestParamName: string) {
	if (!isValueNumber(requestValue))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is not of type number`
		);

	if (!isValueNumber(validator.value))
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validator.value} is not of type number`);
}

function performMinCheck(requestValue: unknown, validator: ValidatorData, requestParamName: string) {
	expectOnlyNumbers(requestValue, validator, requestParamName);
	if ((requestValue as number) < (validator.value as number))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is less than (${validator.value})`
		);
}

function performMaxCheck(requestValue: unknown, validator: ValidatorData, requestParamName: string) {
	expectOnlyNumbers(requestValue, validator, requestParamName);
	if ((requestValue as number) > (validator.value as number))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is more than (${validator.value})`
		);
}

function performOneOfCheck(requestValue: unknown, validator: ValidatorData, requestParamName: string) {
	if (!ObjectUtils.isArrayWithData(validator.value as unknown[]))
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validator.value}) is not of type array`);
	if (typeof requestValue === 'object')
		throw new RsError('BAD_REQUEST', `Request param (${requestParamName}) is not of type string or number`);

	if (!(validator.value as unknown[]).includes(requestValue as string | number))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is not one of (${(
				validator.value as unknown[]
			).join(', ')})`
		);
}

function isValueNumber(value: unknown): value is number {
	return !isNaN(Number(value));
}

export function getRequestData(req: RsRequest<DynamicObject>): DynamicObject {
	let body = '';
	if (req.method === 'GET' || req.method === 'DELETE') {
		body = 'query';
	} else {
		body = 'body';
	}

	const bodyData = req[body as keyof typeof req]; // Cast once and store in a variable

	if (bodyData) {
		for (const attr in bodyData) {
			if (attr === 'token') {
				delete bodyData[attr];
				continue;
			}

			if (bodyData[attr] instanceof Array) {
				const attrList = [];
				for (const value of bodyData[attr]) {
					if (isNaN(Number(value))) continue;
					attrList.push(Number(value));
				}
				if (ObjectUtils.isArrayWithData(attrList)) {
					bodyData[attr] = attrList;
				}
			} else {
				bodyData[attr] = ObjectUtils.safeParse(bodyData[attr]);
				if (isNaN(Number(bodyData[attr]))) continue;
				bodyData[attr] = Number(bodyData[attr]);
			}
		}
	}
	return bodyData;
}

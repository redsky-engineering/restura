import { expect } from 'chai';
import { restura } from '../restura.js';
import { RsError } from '../RsError.js';
import type { RouteData } from '../schemas/resturaSchema.js';
import type { RsRequest } from '../types/customExpressTypes.js';

describe('ResturaEngine', () => {
	it('should handle validation with roles and pass when role matches route', () => {
		restura['validateAuthorization'](
			{
				requesterDetails: {
					role: 'admin',
					scopes: [] as string[]
				}
			} as RsRequest<unknown>,
			{
				roles: ['admin'],
				scopes: [] as string[]
			} as RouteData
		);
	});
	it('should handle validation with roles and fail when role does not match route', () => {
		try {
			restura['validateAuthorization'](
				{
					requesterDetails: {
						role: 'user',
						scopes: [] as string[]
					}
				} as RsRequest<unknown>,
				{
					roles: ['admin'],
					scopes: [] as string[]
				} as RouteData
			);
		} catch (error) {
			expect(error).to.be.an.instanceOf(RsError);
			expect((error as RsError).err).to.equal('FORBIDDEN');
		}
	});
	it('should handle validation with scopes and pass when scope matches route', () => {
		restura['validateAuthorization'](
			{
				requesterDetails: {
					role: '',
					scopes: ['read:user']
				}
			} as RsRequest<unknown>,
			{
				roles: [] as string[],
				scopes: ['read:user']
			} as RouteData
		);
	});
	it('should handle validation with scopes and fail when scope does not match route', () => {
		try {
			restura['validateAuthorization'](
				{
					requesterDetails: {
						role: '',
						scopes: ['read:product']
					}
				} as RsRequest<unknown>,
				{
					roles: [] as string[],
					scopes: ['read:user']
				} as RouteData
			);
		} catch (error) {
			expect(error).to.be.an.instanceOf(RsError);
			expect((error as RsError).err).to.equal('FORBIDDEN');
		}
	});
});

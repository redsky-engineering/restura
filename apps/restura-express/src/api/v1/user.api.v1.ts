import type { RsRequest, RsResponse } from '@restura/core';
import type { AdditionalRequesterDetails } from '../../custom.types.js';
import UserBase1 from './UserBase1.js';
import UserBase2 from './UserBase2.js';

export default class UserApiV1 {
	private userBase1: UserBase1;
	private userBase2: UserBase2;
	constructor() {
		this.userBase1 = new UserBase1();
		this.userBase2 = new UserBase2();
		this.delegateMethods(this.userBase1);
		this.delegateMethods(this.userBase2);
	}

	private delegateMethods(obj: UserBase1 | UserBase2): void {
		Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).forEach((name) => {
			const objAsRecord = obj as unknown as Record<string, unknown>;
			if (name !== 'constructor' && typeof objAsRecord[name] === 'function') {
				(this as Record<string, unknown>)[name] = (...args: unknown[]) =>
					(objAsRecord[name] as (...args: unknown[]) => unknown)(...args);
			}
		});
	}

	async postUserLogin(
		req: RsRequest<Api.V1.User.Login.Post.Req, AdditionalRequesterDetails>,
		res: RsResponse<Api.V1.User.Login.Post.Res>
	) {
		console.log(req.requesterDetails.companyId);
		res.sendData({
			token: 'token',
			tokenExp: '2025-01-01T00:00:00.000Z',
			refreshToken: 'refresh-token',
			refreshTokenExp: '2025-01-01T00:00:00.000Z'
		});
	}
	async postUserMeAvatar(
		_req: RsRequest<Api.V1.User.Me.Avatar.Post.Req>,
		res: RsResponse<Api.V1.User.Me.Avatar.Post.Res>
	) {
		res.sendData(true);
	}
}

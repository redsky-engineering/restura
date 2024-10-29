import type { RsRequest, RsResponse } from '@restura/core';
import type { AdditionalRequesterDetails } from '../../custom.types.js';

export default class UserApiV1 {
	constructor() {}

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
		req: RsRequest<Api.V1.User.Me.Avatar.Post.Req>,
		res: RsResponse<Api.V1.User.Me.Avatar.Post.Res>
	) {
		res.sendData(true);
	}
}

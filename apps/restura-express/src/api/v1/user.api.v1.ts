import type { RsRequest, RsResponse } from '@restura/core';

export default class UserApiV1 {
	constructor() {}

	async postUserLogin(req: RsRequest<Api.V1.User.Login.Post.Req>, res: RsResponse<Api.V1.User.Login.Post.Res>) {
		res.sendData({
			token: 'token',
			tokenExp: '2025-01-01T00:00:00.000Z',
			refreshToken: 'refresh-token',
			refreshTokenExp: '2025-01-01T00:00:00.000Z'
		});
	}
}

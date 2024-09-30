/** Auto generated file from Schema Hash (8fd5beb9fb590a6cee9b0dda6c69498f8b4dc2eff9ac01374ae4ee7f635db665). DO NOT MODIFY **/
declare namespace Model {
	export interface Company {
		id: number;
		createdOn: string;
		modifiedOn: string;
		name?: string;
	}
	export interface User {
		id: number;
		createdOn: string;
		modifiedOn: string;
		firstName: string;
		lastName: string;
		companyId: number;
		password: string;
		email: string;
		role: 'admin' | 'user';
		permissionLogin: boolean;
		lastLoginOn?: string;
		phone?: string;
		loginDisabledOn?: string;
		passwordResetGuid?: string;
		verifyEmailPin?: number;
		verifyEmailPinExpiresOn?: string;
		accountStatus: 'banned' | 'view_only' | 'active';
		passwordResetExpiresOn?: string;
		onboardingStatus: 'verify_email' | 'complete';
		pendingEmail?: string;
	}
}

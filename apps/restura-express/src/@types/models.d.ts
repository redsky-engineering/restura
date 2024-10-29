/** Auto generated file from Schema Hash (72b4082c058dba63abf27a414faeb6c17a1f0d4152c36647777d9a79a1fb53d0). DO NOT MODIFY **/
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

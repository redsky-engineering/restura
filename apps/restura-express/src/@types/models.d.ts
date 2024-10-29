/** Auto generated file from Schema Hash (8119cdb3218f4ad310d01448b9617e80529c081a05dee287b41111d66647fc7e). DO NOT MODIFY **/
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

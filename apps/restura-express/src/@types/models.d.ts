/** Auto generated file from Schema Hash (bdffeb514215bec9744a4036f1524b9e3e8b4ea5d5e72d77743371e1b447cd89). DO NOT MODIFY **/
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

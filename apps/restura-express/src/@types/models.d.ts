/** Auto generated file. DO NOT MODIFY **/

declare namespace Model {
	export interface Item {
		id: number;
		createdOn: string;
		modifiedOn: string;
		orderId: number | null;
	}
	export interface Order {
		id: number;
		createdOn: string;
		modifiedOn: string;
		userId: number;
		amountCents: number;
	}
	export interface Company {
		id: number;
		createdOn: string;
		modifiedOn: string;
		name: string | null;
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
		lastLoginOn: string | null;
		phone: string | null;
		loginDisabledOn: string | null;
		passwordResetGuid: string | null;
		verifyEmailPin: number | null;
		verifyEmailPinExpiresOn: string | null;
		accountStatus: 'banned' | 'view_only' | 'active';
		passwordResetExpiresOn: string | null;
		onboardingStatus: 'verify_email' | 'complete';
		pendingEmail: string | null;
		testAge: number;
		metadata: object;
	}
}

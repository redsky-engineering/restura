/** Auto generated file. DO NOT MODIFY **/

declare namespace Api {
	// V1
	// V1 Endpoints
	export namespace V1 {
		export namespace User {
			// Create User
			// Creates a user.
			export namespace Post {
				export interface Req {
					firstName: string;
					lastName: string;
					email: string;
					role: 'admin' | 'user';
					password: string;
					phone?: string;
				}
				export type Res = CustomTypes.FilteredUser;
			}
			// Update User
			// Update an existing user.
			export namespace Patch {
				export interface Req {
					id: number;
					firstName?: string;
					lastName?: string;
					email?: string;
					role?: 'admin' | 'user';
					password?: string;
				}
				export type Res = CustomTypes.FilteredUser;
			}
			export namespace Me {
				// get my user
				// Get my user
				export namespace Get {
					export interface Req {}
					export interface Res {
						id: number;
						firstName: string;
						lastName: string;
						email: string;
						phone: string | null;
					}
				}
				// Update my user
				// Update my user
				export namespace Patch {
					export interface Req {
						firstName?: string;
						lastName?: string;
						email?: string;
						phone?: string | null;
						password?: string;
					}
					export interface Res {
						id: number;
						firstName: string;
						lastName: string;
						email: string;
						phone: string | null;
					}
				}
				export namespace Avatar {
					// /user/me/avatar
					// Uploading a users avatar and updating the user
					export namespace Post {
						export interface Req {}
						export type Res = boolean;
					}
				}
			}
			export namespace Login {
				// Login
				// User login endpoint
				export namespace Post {
					export interface Req {
						username: string;
						password: string;
					}
					export type Res = CustomTypes.AuthResponse;
				}
			}
			export namespace RefreshToken {
				// Refreshes a Token
				// Refresh an old, possibly expired token and returns a new token.
				export namespace Post {
					export interface Req {}
					export type Res = CustomTypes.AuthResponse;
				}
			}
			export namespace ChangeEmail {
				// Change Email Request
				// Request to change email. Sends a verification email with pin
				export namespace Post {
					export interface Req {
						newEmail: string;
					}
					export type Res = boolean;
				}
				export namespace Commit {
					// Commit Email Change
					// Commits an email change with a pin
					export namespace Patch {
						export interface Req {
							pin: number;
						}
						export type Res = boolean;
					}
				}
			}
			export namespace Logout {
				// Logout
				// User logout endpoint
				export namespace Post {
					export interface Req {}
					export type Res = boolean;
				}
			}
			export namespace CheckAvailable {
				// Check Available
				// Checks if a given username or email or both are available or not
				export namespace Post {
					export interface Req {
						username?: string;
						email?: string;
					}
					export type Res = boolean;
				}
			}
			export namespace VerifyPassword {
				// Verify User Password
				// Verifies a user password to get past security checkpoints
				export namespace Post {
					export interface Req {
						password: string;
					}
					export type Res = boolean;
				}
			}
			export namespace ResendVerifyEmail {
				// Resend Verify Email Pin
				// Resend the email that sends out the verify email pin
				export namespace Post {
					export interface Req {}
					export type Res = boolean;
				}
			}
			export namespace ForgotPassword {
				// Forgot Password
				// Sends a forgot password request
				export namespace Post {
					export interface Req {
						email: string;
					}
					export type Res = boolean;
				}
			}
			export namespace ChangePassword {
				// Change Password
				// Changes a password of the user
				export namespace Post {
					export interface Req {
						oldPassword: string;
						newPassword: string;
					}
					export type Res = boolean;
				}
			}
			export namespace ResetPassword {
				// Reset Password
				// Resets a password using a reset password guid
				export namespace Post {
					export interface Req {
						guid: string;
						newPassword: string;
					}
					export type Res = boolean;
				}
			}
			export namespace VerifyEmail {
				// Verify Email
				// Verifies an email given a pin
				export namespace Post {
					export interface Req {
						pin: number;
					}
					export type Res = boolean;
				}
			}
			export namespace Delete {
				export namespace Me {
					// Delete Me
					// Deletes the user that calls this. This is a post so we don't show password on url.
					export namespace Post {
						export interface Req {
							password: string;
						}
						export type Res = boolean;
					}
				}
			}
			export namespace All {
				// like test
				//
				export namespace Get {
					export interface Req {}
					export interface Res {
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
				export namespace Orders {
					// Get All Users With Order Count
					// Gets all the users with a custom select for order counts
					export namespace Get {
						export interface Req {}
						export interface Res {
							firstName: string;
							lastName: string;
							orderCount: number;
						}
					}
				}
			}
			export namespace Before {
				// Users Before Join
				//
				export namespace Get {
					export interface Req {
						date: string;
					}
					export interface Res {
						id: number;
						firstName: string;
						lastName: string;
						companyName: string | null;
					}
				}
			}
			export namespace WithOrders {
				// Users With Orders
				// Get a list of users with their orders
				export namespace Get {
					export interface Req {}
					export interface Res {
						id: number;
						firstName: string;
						lastName: string;
						order: {
							id: number;
							createdOn: string;
							modifiedOn: string;
						}[];
					}
				}
			}
		}
		export namespace Weather {
			// Get Weather Data
			// Gets the weather data from openweather.org
			export namespace Get {
				export interface Req {
					token: string;
					latitude: number;
					longitude: number;
				}
				export type Res = CustomTypes.WeatherResponse;
			}
		}
		export namespace Order {
			export namespace All {
				// Orders With Joins
				// Multi Join
				export namespace Get {
					export interface Req {}
					export interface Res {
						id: number;
						userFirstName: string;
						userLastName: string;
						companyName: string | null;
					}
				}
			}
		}
		export namespace Item {
			export namespace All {
				// Get All Items with Orders Joined
				// Test to see if left join on orders will have nullable properly
				export namespace Get {
					export interface Req {}
					export interface Res {
						id: number;
						createdOn: string;
						modifiedOn: string;
						orderAmountCents: number | null;
					}
				}
			}
			export namespace Many {
				// Get Item Details Many
				// Get multiple detailed information about an item from an array of ids.
				export namespace Get {
					export interface Req {
						ids: number[];
					}
					export type Res = boolean;
				}
			}
		}
	}
}

declare namespace CustomTypes {
	export interface FilteredUser {
		id: number;
		companyId: number;
		firstName: string;
		lastName: string;
		email: string;
		role: string;
		phone: string;
		lastLoginOn: string;
	}
	export interface AuthResponse {
		token: string;
		tokenExp: string;
		refreshToken: string;
		refreshTokenExp: string;
	}
	export interface WeatherResponse {
		currentTemperatureF: number;
		sunrise: string;
		sunset: string;
		pressure: number;
		humidityPercent: number;
		windSpeedMph: number;
		windDirection: string;
		tomorrowHighF: number;
		tomorrowLowF: number;
	}
	export interface Test extends Restura.PageQuery {
		test: string;
	}
}

declare namespace NotificationTypes {
	export type Order = Pick<Model.Order, 'id' | 'createdOn' | 'modifiedOn' | 'userId' | 'amountCents'>;
	export type Company = Pick<Model.Company, 'id' | 'createdOn' | 'modifiedOn' | 'name'>;
	export type User = Pick<Model.User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
}

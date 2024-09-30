/** Auto generated file from Schema Hash (8fd5beb9fb590a6cee9b0dda6c69498f8b4dc2eff9ac01374ae4ee7f635db665). DO NOT MODIFY **/
declare namespace Api {
	// V1
	// V1 Endpoints
	export namespace V1 {
		export namespace User {
			// Create User
			// Creates a user
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
					}
				}
				// Update my user
				// Update my user
				export namespace Patch {
					export interface Req {
						firstName?: string;
						lastName?: string;
						email?: string;
						phone?: string;
						password?: string;
					}
					export interface Res {
						id: number;
						firstName: string;
						lastName: string;
						email: string;
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
}

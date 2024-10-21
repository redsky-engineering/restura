import React, { FormEvent, useState } from 'react';
import './LoginPage.scss';
import UserService from '../../services/user/UserService.js';
import serviceFactory from '../../services/serviceFactory';
import { WebUtils } from '../../utils/utils';
import themes from '../../themes/themes.scss?export';
import {
	Label,
	Box,
	Button,
	InputText,
	RsFormControl,
	RsFormGroup,
	rsToastify,
	RsValidator,
	RsValidatorEnum
} from '@redskytech/framework/ui';
import { Page } from '@redskytech/framework/996';

enum FormKeys {
	AUTH_TOKEN = 'authToken'
}

const LoginPage: React.FC = () => {
	let userService = serviceFactory.get<UserService>('UserService');
	const [isAttemptingLogin, setIsAttemptingLogin] = useState<boolean>(false);
	const [loginErrorMessage, setLoginErrorMessage] = useState<string>('');
	const [loginForm, setLoginForm] = useState(
		new RsFormGroup([
			new RsFormControl(FormKeys.AUTH_TOKEN, '', [new RsValidator(RsValidatorEnum.REQ, 'Token is required')])
		])
	);

	async function signInUser(e: FormEvent) {
		e.preventDefault();

		if (!(await loginForm.isValid())) {
			setLoginErrorMessage('Please fix login inputs.');
			setLoginForm(loginForm.clone());
			return;
		}

		try {
			setLoginErrorMessage('');
			setIsAttemptingLogin(true);
			let loginValues = loginForm.toModel<{ authToken: string }>();
			await userService.loginUserByToken(loginValues.authToken);
		} catch (e) {
			setIsAttemptingLogin(false);
			setLoginErrorMessage('Failed logging in.');
			rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to login.'), 'Login Error');
		}
	}

	return (
		<Page className="rsLoginPage">
			<Box className="loggedOutTitleBar">
				<Label ml={8} variant={'h6'} weight={'medium'} color={themes.neutralWhite}>
					REDSKY
				</Label>
			</Box>
			<Box className="signInWrapper">
				<Box className="signInContainer">
					<Box className="titleContainer">
						<Label variant={'h4'} weight={'medium'} mb={8}>
							Sign in
						</Label>
						<Label variant={'subtitle2'} weight={'medium'} mb={24} color={themes.neutralWhite50}>
							Access Admin Site
						</Label>
					</Box>
					<form className="signInForm" action={'#'} onSubmit={signInUser}>
						<InputText
							inputMode={'text'}
							className="signInInput"
							placeholder="Token"
							type={'password'}
							look={'filled'}
							control={loginForm.get(FormKeys.AUTH_TOKEN)}
							updateControl={(updateControl) => setLoginForm(loginForm.clone().update(updateControl))}
						/>
						<Button
							className="signInButton"
							look={'containedPrimary'}
							type="submit"
							disabled={isAttemptingLogin}
						>
							{isAttemptingLogin ? 'SIGNING IN...' : 'SIGN IN'}
						</Button>
						{!!loginErrorMessage.length && (
							<Label className="errorText" weight={'medium'} variant={'body2'}>
								{loginErrorMessage}
							</Label>
						)}
					</form>
				</Box>
			</Box>
		</Page>
	);
};

export default LoginPage;

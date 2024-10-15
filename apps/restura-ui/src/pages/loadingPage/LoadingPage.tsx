import * as React from 'react';
import './LoadingPage.scss';
import { Page } from '@redskytech/framework/996';

interface LoadingPageProps {}

const LoadingPage: React.FC<LoadingPageProps> = (props) => {
	return (
		<Page className={'rsLoadingPage'}>
			<span className={'loading'}>
				<img src={require('./Spinner4.gif')} alt="" />
			</span>
		</Page>
	);
};

export default LoadingPage;

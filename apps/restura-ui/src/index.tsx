import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './routes';
import { RecoilRoot } from 'recoil';
import { GlobalStateObserver, GlobalStateInfluencer } from './state/globalState';
import router from './utils/router';
import routes from './routes';
import serviceFactory from './services/serviceFactory';
import { FrameworkSettings, IFrameworkSettings } from '@redskytech/framework/ui';

// Load our static routes in during startup
router.loadStaticRoutes(routes);

// Run our factory creation at the start
serviceFactory.create();

// Load default values for framework components like the labelSelect, LabelInputText, LabelInputTextarea, rsToastify etc...
const frameworkSettings: Partial<IFrameworkSettings> = {
	toasts: {
		icons: {
			custom: '',
			error: 'icon-exclamation-circle',
			info: 'icon-solid-info-circle',
			success: 'icon-check',
			warning: 'icon-exclamation-circle'
		},
		labelVariants: {
			title: 'subtitle1',
			message: 'body1'
		}
	}
};

ReactDOM.render(
	<RecoilRoot>
		<FrameworkSettings overrides={frameworkSettings}>
			<App />
		</FrameworkSettings>
		<GlobalStateObserver />
		<GlobalStateInfluencer />
	</RecoilRoot>,
	document.getElementById('root')
);

import { I996 } from '@redskytech/framework/common/Interfaces';

import NotFoundPage from './pages/notFoundPage/notFoundPage.js';
import LoginPage from './pages/loginPage/LoginPage.js';
import LoadingPage from './pages/loadingPage/LoadingPage.js';
import DatabasePage from './pages/databasePage/DatabasePage.js';
import EndpointsPage from './pages/endpointsPage/EndpointsPage.js';
import GlobalPage from './pages/globalPage/GlobalPage';

export type RoutePaths = '/' | '/database' | '/endpoints' | '/submit' | '/global' | '*' | '/search';

const routes: I996.RouteDetails<RoutePaths>[] = [
	{
		path: '/',
		page: LoginPage,
		options: {
			view: 'login'
		}
	},
	{
		path: '/database',
		page: DatabasePage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '/endpoints',
		page: EndpointsPage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '/global',
		page: GlobalPage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '*',
		page: NotFoundPage
	},
	{
		path: '/search',
		page: LoadingPage
	}
];

export default routes;
(window as any).routes = routes;

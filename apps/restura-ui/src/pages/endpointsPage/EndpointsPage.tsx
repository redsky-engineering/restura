import * as React from 'react';
import './EndpointsPage.scss';
import { Page } from '@redskytech/framework/996';
import { Box } from '@redskytech/framework/ui';
import EndpointListMenu from '../../components/endpointListMenu/EndpointListMenu.js';
import RouteEditor from '../../components/routeEditor/RouteEditor.js';

interface EndpointsPageProps {}

const EndpointsPage: React.FC<EndpointsPageProps> = (props) => {
	return (
		<Page className={'rsEndpointsPage'}>
			<Box display={'flex'}>
				<EndpointListMenu />
				<RouteEditor />
			</Box>
		</Page>
	);
};

export default EndpointsPage;

import { useRecoilValue } from 'recoil';
import globalState from '../state/globalState';
import { useMemo } from 'react';
import { SelectedRoute } from '../services/schema/SchemaService';

export default function useRouteData(): Restura.RouteData | undefined {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);

	const routeData = useMemo<Restura.RouteData | undefined>(() => {
		if (!schema || !selectedRoute) return undefined;
		let endpoints = schema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return undefined;
		return endpoints.routes.find((item) => {
			return item.path === selectedRoute.path && item.method === selectedRoute.method;
		});
	}, [schema, selectedRoute]);

	return routeData;
}

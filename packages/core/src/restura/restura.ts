import { boundMethod } from 'autobind-decorator';
import * as express from 'express';
import { logger } from '../logger/logger.js';

class ResturaEngine {
	private resturaRouter!: express.Router;
	private publicEndpoints: { GET: string[]; POST: string[]; PUT: string[]; PATCH: string[]; DELETE: string[] } = {
		GET: [],
		POST: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	private expressApp!: express.Application;
	private schema!: Restura.Schema;

	async init(app: express.Application): Promise<void> {
		// Middleware
		app.use('/restura', this.resturaAuthentication);
		// app.use('/restura', schemaValidator as unknown as express.RequestHandler);

		// Routes
		// app.put('/restura/v1/schema', this.updateSchema as unknown as express.RequestHandler);
		// app.post('/restura/v1/schema/preview', this.previewCreateSchema as unknown as express.RequestHandler);
		// app.get('/restura/v1/schema', this.getSchema);
		// app.get('/restura/v1/schema/types', this.getSchemaAndTypes);

		this.expressApp = app;

		await this.reloadEndpoints();

		logger.info('Restura Engine Initialized');
	}

	isEndpointPublic(method: string, fullUrl: string): boolean {
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
		return this.publicEndpoints[method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'].includes(fullUrl);
	}

	doesEndpointExist(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', fullUrl: string): boolean {
		return this.schema.endpoints.some((endpoint) => {
			if (!fullUrl.startsWith(endpoint.baseUrl)) return false;
			const pathWithoutBaseUrl = fullUrl.replace(endpoint.baseUrl, '');
			return endpoint.routes.some((route) => {
				return route.method === method && route.path === pathWithoutBaseUrl;
			});
		});
	}

	@boundMethod
	private resturaAuthentication(req: express.Request, res: express.Response, next: express.NextFunction) {
		next();
		//if (req.headers['x-auth-token'] !== config.application.resturaAuthToken) res.status(401).send('Unauthorized');
		//else next();
	}
}

const restura = new ResturaEngine();
export { restura };

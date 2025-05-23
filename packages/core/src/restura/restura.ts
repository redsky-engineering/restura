import { ObjectUtils, StringUtils } from '@redskytech/core-utils';
import { config } from '@restura/internal';
import { boundMethod } from 'autobind-decorator';
import bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { RequestHandler } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import * as prettier from 'prettier';
import { logger } from '../logger/logger.js';
import { RsError } from './RsError.js';
import compareSchema from './compareSchema.js';
import customApiFactory from './customApiFactory.js';
import apiGenerator from './generators/apiGenerator.js';
import customTypeValidationGenerator from './generators/customTypeValidationGenerator.js';
import modelGenerator from './generators/modelGenerator.js';
import resturaGlobalTypesGenerator from './generators/resturaGlobalTypesGenerator.js';
import addApiResponseFunctions from './middleware/addApiResponseFunctions.js';
import { authenticateRequester } from './middleware/authenticateRequester.js';
import { getMulterUpload } from './middleware/getMulterUpload.js';
import { schemaValidation } from './middleware/schemaValidation.js';
import { resturaConfigSchema, type ResturaConfigSchema } from './schemas/resturaConfigSchema.js';
import {
	isSchemaValid,
	StandardRouteData,
	type CustomRouteData,
	type ResturaSchema,
	type RouteData
} from './schemas/resturaSchema.js';
import { PsqlEngine } from './sql/PsqlEngine.js';
import { PsqlPool } from './sql/PsqlPool.js';
import type { RsRequest, RsResponse } from './types/customExpressTypes.js';
import type { AuthenticateHandler } from './types/resturaTypes.js';
import TempCache from './utils/TempCache.js';
import { sortObjectKeysAlphabetically } from './utils/utils.js';
import ResponseValidator from './validators/ResponseValidator.js';
import requestValidator, { ValidationDictionary } from './validators/requestValidator.js';

class ResturaEngine {
	// Make public so other modules can access without re-parsing the config
	resturaConfig!: ResturaConfigSchema;

	private multerCommonUpload!: multer.Multer;
	private resturaRouter!: express.Router;
	private publicEndpoints: { GET: string[]; POST: string[]; PUT: string[]; PATCH: string[]; DELETE: string[] } = {
		GET: [],
		POST: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	private expressApp!: express.Application;
	private schema!: ResturaSchema;
	private responseValidator!: ResponseValidator;
	private authenticationHandler!: AuthenticateHandler;
	private customTypeValidation!: ValidationDictionary;
	private psqlConnectionPool!: PsqlPool;
	private psqlEngine!: PsqlEngine;

	/**
	 * Initializes the Restura engine with the provided Express application.
	 *
	 * @param app - The Express application instance to initialize with Restura.
	 * @returns A promise that resolves when the initialization is complete.
	 */
	async init(
		app: express.Application,
		authenticationHandler: AuthenticateHandler,
		psqlConnectionPool: PsqlPool
	): Promise<void> {
		// Try to load config first. If it fails, we can't continue.
		this.resturaConfig = config.validate('restura', resturaConfigSchema) as ResturaConfigSchema;

		this.multerCommonUpload = getMulterUpload(this.resturaConfig.fileTempCachePath);
		new TempCache(this.resturaConfig.fileTempCachePath);
		this.psqlConnectionPool = psqlConnectionPool;
		this.psqlEngine = new PsqlEngine(this.psqlConnectionPool, true, this.resturaConfig.scratchDatabaseSuffix);

		await customApiFactory.loadApiFiles(this.resturaConfig.customApiFolderPath);

		this.authenticationHandler = authenticationHandler;

		// Middleware and general setup
		app.use(compression());
		app.use(bodyParser.json({ limit: '32mb' }));
		app.use(bodyParser.urlencoded({ limit: '32mb', extended: false }));
		app.use(cookieParser());
		// Disable the X-Powered-By header
		app.disable('x-powered-by');

		app.use('/', addApiResponseFunctions as unknown as express.RequestHandler);
		app.use('/api/', authenticateRequester(this.authenticationHandler) as unknown as express.RequestHandler);
		app.use('/restura', this.resturaAuthentication);

		// Routes specific to Restura
		app.put(
			'/restura/v1/schema',
			schemaValidation as unknown as express.RequestHandler,
			this.updateSchema as unknown as express.RequestHandler
		);
		app.post(
			'/restura/v1/schema/preview',
			schemaValidation as unknown as express.RequestHandler,
			this.previewCreateSchema as unknown as express.RequestHandler
		);
		app.get('/restura/v1/schema', this.getSchema);
		app.get('/restura/v1/schema/types', this.getSchemaAndTypes);

		this.expressApp = app;

		await this.reloadEndpoints();
		await this.validateGeneratedTypesFolder();

		logger.info('Restura Engine Initialized');
	}

	/**
	 * Determines if a given endpoint is public based on the HTTP method and full URL. This
	 * is determined on whether the endpoint in the schema has no roles or scopes assigned to it.
	 *
	 * @param method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'PATCH', 'DELETE').
	 * @param fullUrl - The full URL of the endpoint.
	 * @returns A boolean indicating whether the endpoint is public.
	 */
	isEndpointPublic(method: string, fullUrl: string): boolean {
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
		return this.publicEndpoints[method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'].includes(fullUrl);
	}

	/**
	 * Checks if an endpoint exists for a given HTTP method and full URL.
	 *
	 * @param method - The HTTP method to check (e.g., 'GET', 'POST', 'PUT', 'PATCH', 'DELETE').
	 * @param fullUrl - The full URL of the endpoint to check.
	 * @returns `true` if the endpoint exists, otherwise `false`.
	 */
	doesEndpointExist(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', fullUrl: string): boolean {
		return this.schema.endpoints.some((endpoint) => {
			if (!fullUrl.startsWith(endpoint.baseUrl)) return false;
			const pathWithoutBaseUrl = fullUrl.replace(endpoint.baseUrl, '');
			return endpoint.routes.some((route) => {
				return route.method === method && route.path === pathWithoutBaseUrl;
			});
		});
	}

	/**
	 * Generates an API from the provided schema and writes it to the specified output file.
	 *
	 * @param outputFile - The path to the file where the generated API will be written.
	 * @param providedSchema - The schema from which the API will be generated.
	 * @returns A promise that resolves when the API has been successfully generated and written to the output file.
	 */
	async generateApiFromSchema(outputFile: string, providedSchema: ResturaSchema): Promise<void> {
		fs.writeFileSync(outputFile, await apiGenerator(providedSchema));
	}

	/**
	 * Generates a model from the provided schema and writes it to the specified output file.
	 *
	 * @param outputFile - The path to the file where the generated model will be written.
	 * @param providedSchema - The schema from which the model will be generated.
	 * @returns A promise that resolves when the model has been successfully written to the output file.
	 */
	async generateModelFromSchema(outputFile: string, providedSchema: ResturaSchema): Promise<void> {
		fs.writeFileSync(outputFile, await modelGenerator(providedSchema));
	}

	/**
	 * Generates the ambient module declaration for Restura global types and writes it to the specified output file.
	 * These types are used sometimes in the CustomTypes
	 * @param outputFile
	 */
	generateResturaGlobalTypes(outputFile: string): void {
		fs.writeFileSync(outputFile, resturaGlobalTypesGenerator());
	}

	/**
	 * Retrieves the latest file system schema for Restura.
	 *
	 * @returns {Promise<ResturaSchema>} A promise that resolves to the latest Restura schema.
	 * @throws {Error} If the schema file is missing or the schema is not valid.
	 */
	async getLatestFileSystemSchema(): Promise<ResturaSchema> {
		if (!fs.existsSync(this.resturaConfig.schemaFilePath)) {
			logger.error(`Missing restura schema file, expected path: ${this.resturaConfig.schemaFilePath}`);
			throw new Error('Missing restura schema file');
		}

		const schemaFileData = fs.readFileSync(this.resturaConfig.schemaFilePath, { encoding: 'utf8' });
		const schema: ResturaSchema = ObjectUtils.safeParse(schemaFileData) as ResturaSchema;
		const isValid = await isSchemaValid(schema);
		if (!isValid) {
			logger.error('Schema is not valid');
			throw new Error('Schema is not valid');
		}
		return schema;
	}

	private async reloadEndpoints() {
		this.schema = await this.getLatestFileSystemSchema();
		this.customTypeValidation = customTypeValidationGenerator(this.schema);
		this.resturaRouter = express.Router();
		this.resetPublicEndpoints();

		let routeCount = 0;
		for (const endpoint of this.schema.endpoints) {
			const baseUrl = endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl.slice(0, -1) : endpoint.baseUrl;
			this.expressApp.use(baseUrl, (req, res, next) => {
				// When you do an express use the baseUrl is stripped from the url, so we need to add to the router each baseUrl usage.
				this.resturaRouter(req, res, next);
			});
			for (const route of endpoint.routes) {
				route.path = route.path.startsWith('/') ? route.path : `/${route.path}`;
				route.path = route.path.endsWith('/') ? route.path.slice(0, -1) : route.path;
				const fullUrl = `${baseUrl}${route.path}`;

				if (route.roles.length === 0 && route.scopes.length === 0)
					this.publicEndpoints[route.method].push(fullUrl);

				this.resturaRouter[route.method.toLowerCase() as Lowercase<typeof route.method>](
					route.path, // <-- Notice we only use path here since the baseUrl is already added to the router.
					this.executeRouteLogic as unknown as express.RequestHandler
				);
				routeCount++;
			}
		}
		this.responseValidator = new ResponseValidator(this.schema);

		logger.info(`Restura loaded (${routeCount}) endpoint${routeCount > 1 ? 's' : ''}`);
	}

	private async validateGeneratedTypesFolder() {
		if (!fs.existsSync(this.resturaConfig.generatedTypesPath)) {
			fs.mkdirSync(this.resturaConfig.generatedTypesPath, { recursive: true });
		}

		this.updateTypes();
	}

	@boundMethod
	private resturaAuthentication(req: express.Request, res: express.Response, next: express.NextFunction) {
		if (req.headers['x-auth-token'] !== this.resturaConfig.authToken) res.status(401).send('Unauthorized');
		else next();
	}

	@boundMethod
	private async previewCreateSchema(req: RsRequest<ResturaSchema>, res: express.Response) {
		try {
			const schemaDiff = await compareSchema.diffSchema(req.data, this.schema, this.psqlEngine);
			res.send({ data: schemaDiff });
		} catch (err) {
			res.status(400).send(err);
		}
	}

	@boundMethod
	private async updateSchema(req: RsRequest<ResturaSchema>, res: express.Response) {
		try {
			this.schema = sortObjectKeysAlphabetically(req.data);
			await this.storeFileSystemSchema();
			await this.reloadEndpoints();
			await this.updateTypes();
			res.send({ data: 'success' });
		} catch (err) {
			if (err instanceof Error) res.status(400).send(err.message);
			else res.status(400).send('Unknown error');
		}
	}

	private async updateTypes() {
		await this.generateApiFromSchema(path.join(this.resturaConfig.generatedTypesPath, 'api.d.ts'), this.schema);
		await this.generateModelFromSchema(
			path.join(this.resturaConfig.generatedTypesPath, 'models.d.ts'),
			this.schema
		);
		this.generateResturaGlobalTypes(path.join(this.resturaConfig.generatedTypesPath, 'restura.d.ts'));
	}

	@boundMethod
	private async getSchema(req: express.Request, res: express.Response) {
		res.send({ data: this.schema });
	}

	@boundMethod
	private async getSchemaAndTypes(req: express.Request, res: express.Response) {
		try {
			const schema = await this.getLatestFileSystemSchema();
			const apiText = await apiGenerator(schema);
			const modelsText = await modelGenerator(schema);
			res.send({ schema, api: apiText, models: modelsText });
		} catch (err) {
			res.status(400).send({ error: err });
		}
	}

	@boundMethod
	private async getMulterFilesIfAny<T>(req: RsRequest<T>, res: RsResponse<T>, routeData: RouteData) {
		if (!req.header('content-type')?.includes('multipart/form-data')) return;
		if (!this.isCustomRoute(routeData)) return;

		if (!routeData.fileUploadType) {
			throw new RsError('BAD_REQUEST', 'File upload type not defined for route');
		}

		const multerFileUploadFunction: RequestHandler =
			routeData.fileUploadType === 'MULTIPLE'
				? this.multerCommonUpload.array('files')
				: this.multerCommonUpload.single('file');

		return new Promise<void>((resolve, reject) => {
			multerFileUploadFunction(req as unknown as express.Request, res, (err: unknown) => {
				if (err) {
					logger.warn('Multer error: ' + err);
					reject(err);
				}
				if (req.body['data']) req.body = JSON.parse(req.body['data']);
				resolve();
			});
		});
	}

	@boundMethod
	private async executeRouteLogic<T>(req: RsRequest<T>, res: RsResponse<T>, next: express.NextFunction) {
		try {
			// Locate the route in the schema
			const routeData = this.getRouteData(req.method, req.baseUrl, req.path);

			// Validate the requester has access to the endpoint
			this.validateAuthorization(req, routeData);

			// Check for file uploads
			await this.getMulterFilesIfAny(req, res, routeData);

			// Validate the request and assign to req.data
			requestValidator(req as RsRequest<unknown>, routeData, this.customTypeValidation);

			// Check for custom logic
			if (this.isCustomRoute(routeData)) {
				await this.runCustomRouteLogic(req, res, routeData);
				return;
			}

			// Run SQL query
			const data = await this.psqlEngine.runQueryForRoute(
				req as RsRequest<unknown>,
				routeData as StandardRouteData,
				this.schema
			);

			// Validate the response
			this.responseValidator.validateResponseParams(data, req.baseUrl, routeData);

			// Send response
			if (routeData.type === 'PAGED') res.sendNoWrap(data as T);
			else res.sendData(data as T);
		} catch (e) {
			next(e);
		}
	}

	@boundMethod
	private isCustomRoute(route: RouteData): route is CustomRouteData {
		return route.type === 'CUSTOM_ONE' || route.type === 'CUSTOM_ARRAY' || route.type === 'CUSTOM_PAGED';
	}

	@boundMethod
	private async runCustomRouteLogic<T>(req: RsRequest<T>, res: RsResponse<T>, routeData: RouteData) {
		const version = req.baseUrl.split('/')[2];
		let domain = routeData.path.split('/')[1];
		domain = domain.split('-').reduce((acc, value, index) => {
			if (index === 0) acc = value;
			else acc += StringUtils.capitalizeFirst(value);
			return acc;
		}, '');
		const customApiName = `${StringUtils.capitalizeFirst(domain)}Api${StringUtils.capitalizeFirst(version)}`;

		const customApi = customApiFactory.getCustomApi(customApiName);
		if (!customApi) throw new RsError('NOT_FOUND', `API domain ${domain}-${version} not found`);

		const functionName = `${routeData.method.toLowerCase()}${routeData.path
			.replace(new RegExp('-', 'g'), '/')
			.split('/')
			.reduce((acc, cur) => {
				if (cur === '') return acc;
				return acc + StringUtils.capitalizeFirst(cur);
			}, '')}`;

		// @ts-expect-error - Here we are dynamically calling the function from a custom class, not sure how to typescript this
		const customFunction = customApi[functionName] as (
			req: RsRequest<T>,
			res: RsResponse<T>,
			routeData: RouteData
		) => Promise<void>;
		if (!customFunction)
			throw new RsError('NOT_FOUND', `API path ${routeData.path} not implemented ${functionName}`);
		await customFunction(req, res, routeData);
	}

	private async storeFileSystemSchema() {
		const schemaPrettyStr = await prettier.format(JSON.stringify(this.schema), {
			parser: 'json',
			...{
				trailingComma: 'none',
				tabWidth: 4,
				useTabs: true,
				endOfLine: 'lf',
				printWidth: 120,
				singleQuote: true
			}
		});
		fs.writeFileSync(this.resturaConfig.schemaFilePath, schemaPrettyStr);
	}

	private resetPublicEndpoints() {
		this.publicEndpoints = {
			GET: [],
			POST: [],
			PUT: [],
			PATCH: [],
			DELETE: []
		};
	}

	private validateAuthorization(req: RsRequest<unknown>, routeData: RouteData) {
		const requesterRole = req.requesterDetails.role;
		const requesterScopes = req.requesterDetails.scopes;
		if (routeData.roles.length === 0 && routeData.scopes.length === 0) return;
		if (requesterRole && routeData.roles.length > 0 && !routeData.roles.includes(requesterRole))
			throw new RsError('FORBIDDEN', 'Not authorized to access this endpoint');
		if (
			requesterScopes.length > 0 &&
			routeData.scopes.length > 0 &&
			!routeData.scopes.some((scope) => requesterScopes.includes(scope))
		)
			throw new RsError('FORBIDDEN', 'Not authorized to access this endpoint');
	}

	private getRouteData(method: string, baseUrl: string, path: string): RouteData {
		const endpoint = this.schema.endpoints.find((item) => {
			return item.baseUrl === baseUrl;
		});
		if (!endpoint) throw new RsError('NOT_FOUND', 'Route not found');
		const route = endpoint.routes.find((item) => {
			return item.method === method && item.path === path;
		});
		if (!route) throw new RsError('NOT_FOUND', 'Route not found');
		return route;
	}
}

const restura = new ResturaEngine();
export { restura };

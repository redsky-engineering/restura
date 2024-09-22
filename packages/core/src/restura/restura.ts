import { boundMethod } from 'autobind-decorator';
import * as express from 'express';
import { logger } from '../logger/logger.js';

class ResturaEngine {
	async init(app: express.Application): Promise<void> {
		// Middleware
		app.use('/restura', this.resturaAuthentication);

		logger.info('Restura Engine Initialized');
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

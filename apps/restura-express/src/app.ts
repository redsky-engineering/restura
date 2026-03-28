import { restura } from '@restura/core';
import { createLogger } from '@restura/logger';
import express from 'express';
import authenticationHandler from './authenticationHandler.js';
import errorHandler from './errorHandler.js';
import psqlConnectionPool from './psqlConnectionPool.js';

const logger = createLogger({ level: 'debug' });

const app = express();
await restura.init(app, authenticationHandler, psqlConnectionPool, { logger });

app.use('/api', errorHandler as unknown as express.RequestHandler);

logger.info('Post Init');

app.listen(3001, () => {
	logger.info('Server running on port 3001');
});

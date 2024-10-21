import { logger, restura } from '@restura/core';
import express from 'express';
import authenticationHandler from './authenticationHandler.js';
import errorHandler from './errorHandler.js';
import psqlConnectionPool from './psqlConnectionPool.js';

const app = express();
await restura.init(app, authenticationHandler, psqlConnectionPool);

app.use('/api', errorHandler as unknown as express.RequestHandler);

logger.info('Post Init');

app.listen(3001, () => {
	logger.info('Server running on port 3001');
});

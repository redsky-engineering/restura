import { logger, restura } from '@restura/core';
import express from 'express';
import authenticationHandler from '../authenticationHandler';
import psqlConnectionPool from './psqlConnectionPool';

const app = express();
restura.init(app, authenticationHandler, psqlConnectionPool);

logger.info('Post Init');

app.listen(3001, () => {
	logger.info('Server running on port 3001');
});

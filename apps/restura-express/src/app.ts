import { logger, restura } from '@restura/core';
import express from 'express';

const app = express();
restura.init(app);

logger.info('Post Init');

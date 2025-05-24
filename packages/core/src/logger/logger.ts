import { config } from '@restura/internal';
import winston from 'winston';
// We use the logform module instead of bundled winston.format because then we can enable stack errors in the console output
import { format } from 'logform';
import { loggerConfigSchema } from './loggerConfigSchema.js';

const loggerConfig = await config.validate('logger', loggerConfigSchema);

const consoleFormat = format.combine(
	format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss.sss'
	}),
	format.errors({ stack: true }),
	format.padLevels(),
	format.colorize({ all: true }),
	format.printf((info) => {
		return `[${info.timestamp}] ${info.level} ${info.message}`;
	})
);

// Create a default logger that works immediately
const logger = winston.createLogger({
	level: loggerConfig.level,
	format: format.combine(
		format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss.sss'
		}),
		format.errors({ stack: true }),
		format.json()
	),
	transports: [new winston.transports.Console({ format: consoleFormat })]
});

export { logger };

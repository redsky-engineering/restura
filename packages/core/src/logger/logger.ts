import { config } from '@restura/internal';
import winston from 'winston';
// We use the logform module instead of bundled winston.format because then we can enable stack errors in the console output
import { format } from 'logform';
import { loggerConfigSchema } from './loggerConfigSchema.js';

const consoleFormat = format.combine(
	format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss.sss'
	}),
	format.errors({ stack: true }),
	format.padLevels(),
	format.colorize({ all: true }),
	format.printf((info) => {
		return `[${info.timestamp}] ${info.level}  ${info.message}`;
	})
);

// Create a default logger that works immediately
const logger = winston.createLogger({
	level: 'info',
	format: format.combine(
		format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss.sss'
		}),
		format.errors({ stack: true }),
		format.json()
	),
	transports: [new winston.transports.Console({ format: consoleFormat })]
});

// Since config.validate is async because it loads the config from an esm file,
// we need to wait for it to complete before we can update the logger level.
// This could cause an issue if you log immediate after its first imported but
// I don't think it's a big deal and could not find a better solution.
config
	.validate('logger', loggerConfigSchema)
	.then((loggerConfig) => {
		if (loggerConfig.level) {
			logger.level = loggerConfig.level;
		}
	})
	.catch((error) => {
		logger.error('Failed to load logger config:', error);
	});

export { logger };

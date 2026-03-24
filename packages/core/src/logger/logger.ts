import { config } from '@restura/internal';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { RsError } from '../restura/RsError.js';
import { loggerConfigSchema, type LoggerConfigSchema } from './loggerConfigSchema.js';

const logLevelMap: Record<string, string> = {
	fatal: 'fatal',
	error: 'error',
	warn: 'warn',
	info: 'info',
	debug: 'debug',
	silly: 'trace',
	trace: 'trace'
};

function buildDefaultStream() {
	return pinoPretty({
		colorize: true,
		translateTime: 'yyyy-mm-dd HH:MM:ss.l',
		ignore: 'pid,hostname,_meta',
		messageFormat: '{msg}',
		levelFirst: true,
		customColors: 'error:red,warn:yellow,info:green,debug:blue,trace:magenta',
		destination: process.stdout
	});
}

function buildErrorSerializer(loggerConfig?: LoggerConfigSchema) {
	const baseSerializer = pino.stdSerializers.err;

	const defaultSerializer = (error: unknown) => {
		const isAxiosError =
			error !== null &&
			typeof error === 'object' &&
			'isAxiosError' in error &&
			(error as { isAxiosError: unknown }).isAxiosError === true;

		if (isAxiosError) {
			const err = error as unknown as {
				message: string;
				stack: string;
				config: { url: string; method: string };
				response: { status: number; data: unknown };
			};
			return {
				type: 'AxiosError',
				message: err.message,
				stack: err.stack,
				url: err.config?.url,
				method: err.config?.method?.toUpperCase(),
				status: err.response?.status,
				responseData: err.response?.data
			};
		}

		if (RsError.isRsError(error)) return error.toJSON();
		return baseSerializer(error as Error);
	};

	if (!loggerConfig?.serializers?.err) return defaultSerializer;

	try {
		return loggerConfig.serializers.err(baseSerializer);
	} catch (err) {
		console.error('Failed to initialize custom error serializer, falling back to default', err);
		return defaultSerializer;
	}
}

function buildPinoInstance(loggerConfig?: LoggerConfigSchema): pino.Logger {
	const level = loggerConfig ? logLevelMap[loggerConfig.level] : 'info';
	const stream = loggerConfig?.stream ?? buildDefaultStream();
	const transport = loggerConfig?.transports ? { transport: { targets: loggerConfig.transports } } : {};

	return pino({ level, ...transport, serializers: { err: buildErrorSerializer(loggerConfig) } }, stream);
}

function buildContext(args: unknown[]) {
	const ctx: Record<string, unknown> = {};
	const prims: unknown[] = [];

	for (const arg of args) {
		if (arg instanceof Error && !ctx.err) {
			ctx.err = arg;
		} else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
			Object.assign(ctx, arg as object);
		} else {
			prims.push(arg);
		}
	}

	if (prims.length) ctx.args = prims;
	return ctx;
}

type LogFunction = { (msg: string, ...args: unknown[]): void; (msg: unknown): void };

let pinoLogger = buildPinoInstance();

function log(level: pino.Level, msg: string | unknown, ...args: unknown[]) {
	if (typeof msg === 'string') {
		pinoLogger[level](buildContext(args), msg);
	} else {
		pinoLogger[level](msg);
	}
}

const logger = {
	level: 'info' as string,

	async configure(): Promise<void> {
		const loggerConfig = await config.validate('logger', loggerConfigSchema);
		logger.level = loggerConfig.level;
		pinoLogger = buildPinoInstance(loggerConfig);
	},

	fatal: ((msg, ...args) => log('fatal', msg, ...args)) as LogFunction,
	error: ((msg, ...args) => log('error', msg, ...args)) as LogFunction,
	warn: ((msg, ...args) => log('warn', msg, ...args)) as LogFunction,
	info: ((msg, ...args) => log('info', msg, ...args)) as LogFunction,
	debug: ((msg, ...args) => log('debug', msg, ...args)) as LogFunction,
	silly: ((msg, ...args) => log('trace', msg, ...args)) as LogFunction,
	trace: ((msg, ...args) => log('trace', msg, ...args)) as LogFunction
};

export { logger };

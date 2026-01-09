import { config } from '@restura/internal';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { RsError } from '../restura/RsError.js';
import { loggerConfigSchema } from './loggerConfigSchema.js';

const loggerConfig = await config.validate('logger', loggerConfigSchema);

const logLevelMap = {
	fatal: 'fatal',
	error: 'error',
	warn: 'warn',
	info: 'info',
	debug: 'debug',
	silly: 'trace',
	trace: 'trace'
};

const currentLogLevel = logLevelMap[loggerConfig.level];

const defaultStream = pinoPretty({
	colorize: true,
	translateTime: 'yyyy-mm-dd HH:MM:ss.l',
	ignore: 'pid,hostname,_meta', // _meta allows a user to pass in metadata for JSON but not print it to the console
	messageFormat: '{msg}',
	levelFirst: true,
	customColors: 'error:red,warn:yellow,info:green,debug:blue,trace:magenta',
	destination: process.stdout
});

function isAxiosError(error: unknown): boolean {
	const isObject = (error: unknown) => error !== null && typeof error === 'object';
	return isObject(error) && 'isAxiosError' in error && error.isAxiosError === true;
}

const baseSerializer = pino.stdSerializers.err;

const defaultSerializer = (error: unknown) => {
	if (isAxiosError(error)) {
		const err = error as Record<string, unknown> as {
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

	if (RsError.isRsError(error)) {
		return error.toJSON();
	}

	return baseSerializer(error as Error);
};

const errorSerializer = (() => {
	try {
		return loggerConfig.serializers?.err ? loggerConfig.serializers.err(baseSerializer) : defaultSerializer;
	} catch (error) {
		console.error('Failed to initialize custom error serializer, falling back to default', error);
		return defaultSerializer;
	}
})();

const pinoLogger = pino(
	{
		level: currentLogLevel,
		...(loggerConfig.transports ? { transport: { targets: loggerConfig.transports } } : {}),
		serializers: {
			err: errorSerializer
		}
	},
	loggerConfig.stream ? loggerConfig.stream : defaultStream
);

type Primitive = string | number | boolean | null | undefined;

function buildContext(args: unknown[]) {
	const ctx: Record<string, unknown> = {};
	const prims: Primitive[] = [];

	for (const arg of args) {
		if (arg instanceof Error && !ctx.err) {
			ctx.err = arg;
		} else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
			Object.assign(ctx, arg as object);
		} else {
			prims.push(arg as Primitive);
		}
	}

	if (prims.length) ctx.args = prims;
	return ctx;
}

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

function log(level: Level, message: string, ...args: unknown[]) {
	pinoLogger[level](buildContext(args), message);
}

type LogFunction = {
	(msg: string, ...args: unknown[]): void;
	(msg: unknown): void;
};

const logger = {
	level: loggerConfig.level,
	fatal: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('fatal', msg, ...args);
		} else {
			pinoLogger.fatal(msg);
		}
	}) as LogFunction,
	error: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('error', msg, ...args);
		} else {
			pinoLogger.error(msg);
		}
	}) as LogFunction,
	warn: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('warn', msg, ...args);
		} else {
			pinoLogger.warn(msg);
		}
	}) as LogFunction,
	info: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('info', msg, ...args);
		} else {
			pinoLogger.info(msg);
		}
	}) as LogFunction,
	debug: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('debug', msg, ...args);
		} else {
			pinoLogger.debug(msg);
		}
	}) as LogFunction,
	silly: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('trace', msg, ...args);
		} else {
			pinoLogger.trace(msg);
		}
	}) as LogFunction,
	trace: ((msg: string | unknown, ...args: unknown[]) => {
		if (typeof msg === 'string') {
			log('trace', msg, ...args);
		} else {
			pinoLogger.trace(msg);
		}
	}) as LogFunction
};

export { logger };

import { config } from '@restura/internal';
import pino from 'pino';
import { loggerConfigSchema } from './loggerConfigSchema.js';

const loggerConfig = await config.validate('logger', loggerConfigSchema);

const logLevelMap = {
	info: 'info',
	warn: 'warn',
	error: 'error',
	debug: 'debug',
	silly: 'trace'
};

const currentLogLevel = logLevelMap[loggerConfig.level];

const pinoLogger = pino({
	level: currentLogLevel,
	transport: {
		targets: [
			{
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'yyyy-mm-dd HH:MM:ss.l',
					ignore: 'pid,hostname',
					messageFormat: '{msg}',
					levelFirst: true,
					customColors: 'error:red,warn:yellow,info:green,debug:blue,trace:magenta'
				}
			}
			// {
			// 	target: 'pino/file',
			// 	level: 'info',
			// 	options: { destination: 1 } // 1 = stdout, or use file path
			// }
		]
	},
	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err
	}
});

type Primitive = string | number | boolean | null | undefined;

function buildContext(args: unknown[]) {
	// Pull out a single Error (first one wins)
	let err: Error | undefined;
	const rest: unknown[] = [];
	for (const a of args) {
		if (!err && a instanceof Error) err = a;
		else rest.push(a);
	}

	// Merge plain objects, collect primitives
	const ctx: Record<string, unknown> = {};
	const prims: Primitive[] = [];

	for (const a of rest) {
		if (a && typeof a === 'object' && !Array.isArray(a)) {
			Object.assign(ctx, a as object);
		} else {
			prims.push(a as Primitive);
		}
	}

	if (prims.length) ctx.args = prims; // keeps unlabeled primitives visible
	if (err) (ctx as any).err = err;

	return ctx;
}

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

function log(level: Level, message: string, ...args: unknown[]) {
	const ctx = buildContext(args);
	// If there's no context at all, let pino log just the message
	if (Object.keys(ctx).length === 0) {
		(pinoLogger as any)[level](message);
	} else {
		(pinoLogger as any)[level](ctx, message);
	}
}

type LogFunction = {
	(msg: string, ...args: unknown[]): void;
	(msg: unknown): void;
};

const logger = {
	level: loggerConfig.level,
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
	}) as LogFunction
};

export { logger };

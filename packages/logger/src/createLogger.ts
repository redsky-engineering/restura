import { RsError, type LogLevel, type ResturaLogger } from '@restura/core';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import type { LoggerConfig } from './loggerConfigSchema.js';

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

function buildErrorSerializer(loggerConfig?: LoggerConfig) {
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

function buildPinoInstance(loggerConfig: LoggerConfig | undefined, level: string): pino.Logger {
	const options: pino.LoggerOptions = { level, serializers: { err: buildErrorSerializer(loggerConfig) } };

	if (loggerConfig?.transports) {
		options.transport = { targets: loggerConfig.transports };
		return pino(options);
	}

	return pino(options, loggerConfig?.stream ?? buildDefaultStream());
}

function buildContext(args: unknown[]) {
	const ctx: Record<string, unknown> = {};
	const primitives: unknown[] = [];

	for (const arg of args) {
		if (arg instanceof Error && !ctx.err) {
			ctx.err = arg;
		} else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
			Object.assign(ctx, arg as object);
		} else {
			primitives.push(arg);
		}
	}

	if (primitives.length) ctx.args = primitives;
	return ctx;
}

function log(pinoInstance: pino.Logger, level: pino.Level, msg: string | unknown, ...args: unknown[]) {
	if (typeof msg === 'string') {
		pinoInstance[level](buildContext(args), msg);
	} else {
		pinoInstance[level](buildContext([msg, ...args]));
	}
}

export function createLogger(config?: LoggerConfig): ResturaLogger {
	const VALID_LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
	const envLevel = process.env.RESTURA_LOG_LEVEL;
	const level = config?.level ?? (VALID_LEVELS.includes(envLevel as LogLevel) ? (envLevel as LogLevel) : 'info');
	const pinoInstance = buildPinoInstance(config, level);

	return {
		level: pinoInstance.level as LogLevel,
		fatal: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'fatal', msg, ...args),
		error: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'error', msg, ...args),
		warn: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'warn', msg, ...args),
		info: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'info', msg, ...args),
		debug: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'debug', msg, ...args),
		trace: (msg: unknown, ...args: unknown[]) => log(pinoInstance, 'trace', msg, ...args)
	};
}

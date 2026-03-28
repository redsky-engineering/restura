export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface ResturaLogger {
	readonly level: LogLevel;
	fatal(msg: unknown, ...args: unknown[]): void;
	error(msg: unknown, ...args: unknown[]): void;
	warn(msg: unknown, ...args: unknown[]): void;
	info(msg: unknown, ...args: unknown[]): void;
	debug(msg: unknown, ...args: unknown[]): void;
	trace(msg: unknown, ...args: unknown[]): void;
}

const LEVEL_ORDER: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

function isLevelEnabled(configured: LogLevel, requested: LogLevel): boolean {
	return LEVEL_ORDER.indexOf(requested) <= LEVEL_ORDER.indexOf(configured);
}

const envLevel = process.env.RESTURA_LOG_LEVEL;
const consoleLoggerLevel: LogLevel = LEVEL_ORDER.includes(envLevel as LogLevel) ? (envLevel as LogLevel) : 'info';

const consoleLogger: ResturaLogger = {
	level: consoleLoggerLevel,
	fatal: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'fatal')) console.error(msg, ...args);
	},
	error: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'error')) console.error(msg, ...args);
	},
	warn: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'warn')) console.warn(msg, ...args);
	},
	info: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'info')) console.log(msg, ...args);
	},
	debug: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'debug')) console.debug(msg, ...args);
	},
	trace: (msg, ...args) => {
		if (isLevelEnabled(consoleLoggerLevel, 'trace')) console.debug(msg, ...args);
	}
};

let _impl: ResturaLogger = consoleLogger;

export const logger: ResturaLogger = {
	get level() {
		return _impl.level;
	},
	fatal: (msg, ...args) => _impl.fatal(msg, ...args),
	error: (msg, ...args) => _impl.error(msg, ...args),
	warn: (msg, ...args) => _impl.warn(msg, ...args),
	info: (msg, ...args) => _impl.info(msg, ...args),
	debug: (msg, ...args) => _impl.debug(msg, ...args),
	trace: (msg, ...args) => _impl.trace(msg, ...args)
};

export function setLogger(impl: ResturaLogger): void {
	if (impl === logger) {
		throw new Error('setLogger: cannot install the proxy logger as its own implementation');
	}
	if (impl === _impl) return;
	_impl = impl;
}

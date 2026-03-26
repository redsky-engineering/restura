import { expect } from 'chai';
import { Writable } from 'node:stream';
import { createLogger } from './createLogger.js';

const nullStream = new Writable({
	write(_chunk, _enc, cb) {
		cb();
	}
});

function createTestStream() {
	const lines: string[] = [];

	const stream = new Writable({
		write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
			chunk
				.toString()
				.split('\n')
				.filter(Boolean)
				.forEach((l) => lines.push(l));
			callback();
		}
	});

	const lastEntry = (): Record<string, unknown> => JSON.parse(lines[lines.length - 1]);

	return { stream, lines, lastEntry };
}

describe('createLogger', () => {
	describe('level configuration', () => {
		it('defaults to info when no config is provided', () => {
			const logger = createLogger();
			expect(logger.level).to.equal('info');
		});

		it('uses the level specified in config', () => {
			const logger = createLogger({ level: 'debug', stream: nullStream });
			expect(logger.level).to.equal('debug');
		});

		it('accepts every valid log level', () => {
			const levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
			for (const level of levels) {
				const logger = createLogger({ level, stream: nullStream });
				expect(logger.level).to.equal(level);
			}
		});
	});

	describe('string message logging', () => {
		it('emits msg when only a string is provided', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info('hello world');

			expect(lastEntry().msg).to.equal('hello world');
		});

		it('merges a trailing plain-object arg into the log entry', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info('request received', { requestId: 'abc-123' });

			const entry = lastEntry();
			expect(entry.msg).to.equal('request received');
			expect(entry.requestId).to.equal('abc-123');
		});

		it('captures a trailing Error in the err field', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.error('something failed', new Error('boom'));

			const entry = lastEntry();
			expect(entry.msg).to.equal('something failed');
			expect((entry.err as Record<string, unknown>).message).to.equal('boom');
		});

		it('merges multiple trailing object args into the log entry', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.warn('conflict detected', { requestId: 'r1' }, { userId: 42 });

			const entry = lastEntry();
			expect(entry.msg).to.equal('conflict detected');
			expect(entry.requestId).to.equal('r1');
			expect(entry.userId).to.equal(42);
		});

		it('collects trailing primitive args into an args array', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info('debug value', 42, true);

			const entry = lastEntry();
			expect(entry.msg).to.equal('debug value');
			expect(entry.args).to.deep.equal([42, true]);
		});

		it('handles an Error and a plain object together as trailing args', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.error('handler failed', new Error('oops'), { requestId: 'req-7' });

			const entry = lastEntry();
			expect(entry.msg).to.equal('handler failed');
			expect((entry.err as Record<string, unknown>).message).to.equal('oops');
			expect(entry.requestId).to.equal('req-7');
		});
	});

	describe('non-string first argument (else-branch)', () => {
		it('captures an Error passed as first arg in the err field', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.error(new Error('database down'));

			const entry = lastEntry();
			expect((entry.err as Record<string, unknown>).message).to.equal('database down');
		});

		it('retains trailing context objects when first arg is an Error', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.error(new Error('not found'), { requestId: 'req-99' });

			const entry = lastEntry();
			expect((entry.err as Record<string, unknown>).message).to.equal('not found');
			expect(entry.requestId).to.equal('req-99');
		});

		it('spreads a plain-object first arg into the log entry', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info({ orderId: 7, status: 'queued' });

			const entry = lastEntry();
			expect(entry.orderId).to.equal(7);
			expect(entry.status).to.equal('queued');
		});

		it('merges plain-object first arg with trailing context objects', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info({ orderId: 7 }, { userId: 99 });

			const entry = lastEntry();
			expect(entry.orderId).to.equal(7);
			expect(entry.userId).to.equal(99);
		});

		it('puts a primitive first arg into the args array', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info(404);

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([404]);
		});

		it('puts a primitive first arg and trailing primitives all into args', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info(404, 'extra', true);

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([404, 'extra', true]);
		});

		it('puts a boolean first arg into the args array', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info(true);

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([true]);
		});

		it('puts a boolean first arg alongside trailing primitives into args', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.warn(false, 42, 'note');

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([false, 42, 'note']);
		});

		it('puts a null first arg into the args array', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info(null);

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([null]);
		});

		it('puts a null first arg alongside trailing context into the entry', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info(null, { requestId: 'r-42' });

			const entry = lastEntry();
			expect(entry.args).to.deep.equal([null]);
			expect(entry.requestId).to.equal('r-42');
		});
	});

	describe('level filtering', () => {
		it('suppresses messages below the configured level', () => {
			const { stream, lines } = createTestStream();
			const logger = createLogger({ level: 'warn', stream });

			logger.info('should be suppressed');
			logger.debug('also suppressed');

			expect(lines).to.have.length(0);
		});

		it('emits messages at or above the configured level', () => {
			const { stream, lines } = createTestStream();
			const logger = createLogger({ level: 'warn', stream });

			logger.warn('at boundary');
			logger.error('above boundary');

			expect(lines).to.have.length(2);
		});

		it('includes the correct pino level number in each entry', () => {
			const { stream, lastEntry } = createTestStream();
			const logger = createLogger({ level: 'trace', stream });

			logger.info('check level');

			expect(lastEntry().level).to.equal(30);
		});
	});

	describe('all log-level methods are callable', () => {
		(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const).forEach((level) => {
			it(`${level}() writes a log entry with the correct msg`, () => {
				const { stream, lastEntry } = createTestStream();
				const logger = createLogger({ level: 'trace', stream });

				logger[level](`${level} message`);

				expect(lastEntry().msg).to.equal(`${level} message`);
			});
		});
	});
});

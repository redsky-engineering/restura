import { expect } from 'chai';
import { logger, setLogger, type ResturaLogger } from './logger.js';

const noopImpl = (): ResturaLogger => ({
	level: 'info',
	fatal: () => {},
	error: () => {},
	warn: () => {},
	info: () => {},
	debug: () => {},
	trace: () => {}
});

describe('setLogger', () => {
	it('throws when trying to install the proxy logger itself', () => {
		expect(() => setLogger(logger)).to.throw(
			'setLogger: cannot install the proxy logger as its own implementation'
		);
	});

	it('is idempotent when reinstalling the current implementation', () => {
		const impl = noopImpl();
		setLogger(impl);
		expect(() => setLogger(impl)).to.not.throw();
	});
});

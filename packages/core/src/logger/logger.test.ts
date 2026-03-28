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
			'setLogger: cannot reinstall the proxy logger or the current logger implementation'
		);
	});

	it('throws when trying to reinstall the current implementation', () => {
		const impl = noopImpl();
		setLogger(impl);

		expect(() => setLogger(impl)).to.throw(
			'setLogger: cannot reinstall the proxy logger or the current logger implementation'
		);
	});
});

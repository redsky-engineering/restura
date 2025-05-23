const config = {
	/** @type {import('./src/restura/schemas/resturaConfigSchema.js').ResturaConfigSchema} */
	restura: {
		authToken: 'my-secret'
	},
	/** @type {import('./src/logger/loggerConfigSchema.js').LoggerConfigSchema} */
	logger: {
		level: 'debug'
	}
};

export default config;

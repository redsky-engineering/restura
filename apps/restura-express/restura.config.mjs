const config = {
	// The @restura/core configuration
	core: {
		port: 3000, // This is the port the server will listen on
		host: 'localhost',
		env: 'development'
	},
	/** @type {import('@restura/core').ResturaConfigSchema} */
	restura: {
		authToken: '12345',
		scratchDatabaseSuffix: 'josh'
	},
	// The @restura/logger configuration
	logger: {
		level: 'silly'
	}
};

export default config;

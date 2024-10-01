module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'], // This will find .test.ts, .spec.ts, .test.js, .spec.js files
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	transform: {
		'^.+\\.ts': 'ts-jest'
	}
};

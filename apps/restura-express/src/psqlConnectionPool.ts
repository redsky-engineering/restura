import { PsqlPool } from '@restura/core';

const psqlConnectionPool = new PsqlPool({
	host: 'localhost',
	port: 5488,
	user: 'postgres',
	database: 'postgres',
	password: 'postgres',
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000
});

export default psqlConnectionPool;

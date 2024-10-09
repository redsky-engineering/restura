import pg, { types } from 'pg';

const { Pool } = pg;

const setupPgReturnTypes = () => {
	// OID for timestamptz in Postgres
	const TIMESTAMPTZ_OID = 1184;
	// Set a custom parser for timestamptz to return an ISO string
	types.setTypeParser(TIMESTAMPTZ_OID, (val) => {
		return val === null ? null : new Date(val).toISOString();
	});
	const BIGINT_OID = 20;
	// Set a custom parser for BIGINT to return a JavaScript Number
	types.setTypeParser(BIGINT_OID, (val) => {
		return val === null ? null : Number(val);
	});
};
setupPgReturnTypes();

// postgresql://postgres:postgres@localhost:5488/postgres
const psqlConnectionPool = new Pool({
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

import { z } from 'zod';

const isTsx = process.argv[1]?.endsWith('.ts');
const isTsNode = process.env.TS_NODE_DEV || process.env.TS_NODE_PROJECT;
const customApiFolderPath = isTsx || isTsNode ? '/src/api' : '/dist/api';

export const resturaConfigSchema = z.object({
	authToken: z.string().min(1, 'Missing Restura Auth Token'),
	sendErrorStackTrace: z.boolean().default(false),
	schemaFilePath: z.string().default(process.cwd() + '/restura.schema.json'),
	customApiFolderPath: z.string().default(process.cwd() + customApiFolderPath),
	generatedTypesPath: z.string().default(process.cwd() + '/src/@types'),
	fileTempCachePath: z.string().optional(),
	scratchDatabaseSuffix: z.string().optional()
});
export type ResturaConfigSchema = z.infer<typeof resturaConfigSchema>;

import { z } from 'zod';

export const loggerConfigSchema = z.object({
	level: z.enum(['info', 'warn', 'error', 'debug']).default('info')
});
export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

export const resturaConfigSchema = z.object({
	authToken: z.string().min(1, 'Missing Restura Auth Token'),
	sendErrorStackTrace: z.boolean().default(false),
	schemaFilePath: z.string().default(process.cwd() + '/restura.schema.json'),
	customApiFolderPath: z.string().default(process.cwd() + '/dist/api'),
	generatedTypesPath: z.string().default(process.cwd() + '/src/@types')
});
export type ResturaConfigSchema = z.infer<typeof resturaConfigSchema>;

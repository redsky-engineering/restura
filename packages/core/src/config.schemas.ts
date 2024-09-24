import { z } from 'zod';

export const loggerConfigSchema = z.object({
	level: z.enum(['info', 'warn', 'error', 'debug']).default('info')
});
export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

export const resturaConfigSchema = z.object({
	authToken: z.string().min(1, 'Missing Restura Auth Token')
});
export type ResturaConfigSchema = z.infer<typeof resturaConfigSchema>;

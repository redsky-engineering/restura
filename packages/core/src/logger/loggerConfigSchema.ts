import { z } from 'zod';

export const loggerConfigSchema = z.object({
	level: z.enum(['info', 'warn', 'error', 'debug', 'silly']).default('info')
});
export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

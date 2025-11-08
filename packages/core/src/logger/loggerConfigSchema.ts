import { z } from 'zod';

export const loggerConfigSchema = z.object({
	level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silly', 'trace']).default('info'),
	transports: z
		.array(
			z.object({
				target: z.string(),
				options: z.record(z.string(), z.unknown()).optional()
			})
		)
		.optional()
});
export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

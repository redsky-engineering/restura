import { SerializerFn } from 'pino';
import { z } from 'zod';

export type ErrorSerializerFactory = (baseSerializer: SerializerFn) => SerializerFn;

export const loggerConfigSchema = z.object({
	level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silly', 'trace']).default('info'),
	transports: z
		.array(
			z.object({
				target: z.string(),
				level: z.string().optional(),
				options: z.record(z.string(), z.unknown()).optional()
			})
		)
		.optional(),
	serializers: z
		.object({
			err: z.custom<ErrorSerializerFactory>().optional()
		})
		.optional()
});
export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

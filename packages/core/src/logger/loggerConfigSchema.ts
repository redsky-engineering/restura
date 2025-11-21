import type { DestinationStream, SerializerFn, TransportTargetOptions } from 'pino';
import { z } from 'zod';

export type ErrorSerializerFactory = (baseSerializer: SerializerFn) => SerializerFn;

export const loggerConfigSchema = z.object({
	level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silly', 'trace']).default('info'),
	transports: z.array(z.custom<TransportTargetOptions>()).optional(),
	serializers: z
		.object({
			err: z.custom<ErrorSerializerFactory>().optional()
		})
		.optional(),
	stream: z.custom<DestinationStream>().optional()
});

export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

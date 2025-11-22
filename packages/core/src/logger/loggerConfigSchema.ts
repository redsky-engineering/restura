import type { DestinationStream, SerializerFn, TransportTargetOptions } from 'pino';
import { z } from 'zod';

export type ErrorSerializerFactory = (baseSerializer: SerializerFn) => SerializerFn;

export const loggerConfigSchema = z
	.object({
		level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silly', 'trace']).default('info'),
		transports: z.array(z.custom<TransportTargetOptions>()).optional(),
		serializers: z
			.object({
				err: z.custom<ErrorSerializerFactory>().optional()
			})
			.optional(),
		stream: z.custom<DestinationStream>().optional()
	})
	.refine((data) => !(data.transports && data.stream), {
		message: 'You must provide either a transports array or a stream object, but not both',
		path: ['transports']
	});

export type LoggerConfigSchema = z.infer<typeof loggerConfigSchema>;

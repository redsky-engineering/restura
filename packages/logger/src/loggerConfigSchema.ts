import type { DestinationStream, Level, SerializerFn, TransportTargetOptions } from 'pino';

export type ErrorSerializerFactory = (baseSerializer: SerializerFn) => SerializerFn;

export interface LoggerConfig {
	level?: Level;
	transports?: TransportTargetOptions[];
	serializers?: {
		err?: ErrorSerializerFactory;
	};
	stream?: DestinationStream;
}

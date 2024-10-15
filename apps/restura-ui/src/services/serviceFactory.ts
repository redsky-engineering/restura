import { Service } from './Service';
import UserService from './user/UserService.js';
import SchemaService from './schema/SchemaService.js';

type ServiceKey = 'UserService' | 'SchemaService';

class ServiceFactory {
	private services: { [key: string]: Service } = {};

	create() {
		// Add new models here to the factory
		this.services['UserService'] = new UserService();
		this.services['SchemaService'] = new SchemaService();

		for (let key in this.services) {
			this.services[key].start();
		}
	}

	get<T extends Service>(name: ServiceKey): T {
		return this.services[name] as T;
	}
}

let serviceFactory = new ServiceFactory();
export default serviceFactory;

// TEMP
window.sf = serviceFactory;

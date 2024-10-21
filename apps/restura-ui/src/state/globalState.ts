import {
	atom,
	RecoilState,
	useRecoilTransactionObserver_UNSTABLE,
	useRecoilCallback,
	RecoilValue,
	Loadable
} from 'recoil';
import * as React from 'react';
import { SelectedRoute } from '../services/schema/SchemaService';

enum GlobalStateKeys {
	AUTH_TOKEN = 'AuthToken',
	SCHEMA = 'Schema',
	ROUTE = 'Route',
	EDIT_MODE = 'EditMode'
}

export type EditMode = 'API_DETAILS' | 'RESPONSE' | 'RAW_DATA' | 'CODE_GEN';

const KEY_PREFIX = 'restura-';

class GlobalState {
	authToken: RecoilState<string | undefined>;
	schema: RecoilState<Restura.Schema | undefined>;
	selectedRoute: RecoilState<SelectedRoute | undefined>;
	editMode: RecoilState<EditMode>;

	saveToStorageList: string[] = [];

	constructor() {
		this.authToken = atom<string | undefined>({
			key: GlobalStateKeys.AUTH_TOKEN,
			default: this.loadFromLocalStorage(GlobalStateKeys.AUTH_TOKEN, undefined)
		});

		this.schema = atom<Restura.Schema | undefined>({
			key: GlobalStateKeys.SCHEMA,
			default: undefined
		});

		this.selectedRoute = atom<SelectedRoute | undefined>({
			key: GlobalStateKeys.ROUTE,
			default: this.loadFromLocalStorage(GlobalStateKeys.ROUTE, undefined)
		});

		this.editMode = atom<EditMode>({
			key: GlobalStateKeys.EDIT_MODE,
			default: this.loadFromLocalStorage(GlobalStateKeys.EDIT_MODE, 'API_DETAILS')
		});

		// Save Variables off into local storage on change
		this.saveToStorageList = [GlobalStateKeys.AUTH_TOKEN, GlobalStateKeys.ROUTE, GlobalStateKeys.EDIT_MODE];
	}

	private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
		let item = localStorage.getItem(KEY_PREFIX + key);
		if (!item) return defaultValue;
		try {
			item = JSON.parse(item);
		} catch (e) {}
		if (typeof item === 'string' && item === 'undefined') return defaultValue;
		// @ts-ignore
		return item;
	}
}

export function clearPersistentState() {
	// All we really need to do is clear local storage
	localStorage.clear();
}

export const GlobalStateObserver: React.FC = () => {
	useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
		for (const item of snapshot.getNodes_UNSTABLE({ isModified: true })) {
			let value = snapshot.getLoadable(item).contents as string;
			if (process.env.NODE_ENV === 'development') {
				console.log('Recoil item changed: ', item.key);
				console.log('Value: ', value);
			}

			if (globalState.saveToStorageList.includes(item.key)) {
				if (typeof value === 'object') value = JSON.stringify(value);
				localStorage.setItem(KEY_PREFIX + item.key, value);
			}
		}
	});
	return null;
};

const globalState = new GlobalState();
export default globalState;

/**
 * Returns a Recoil state value, from anywhere in the app.
 *
 * Can be used outside of the React tree (outside a React component), such as in utility scripts, etc.

 * <GlobalStateInfluencer> must have been previously loaded in the React tree, or it won't work.
 * Initialized as a dummy function "() => null", it's reference is updated to a proper Recoil state mutator when GlobalStateInfluencer is loaded.
 *
 * @example const lastCreatedUser = getRecoilExternalValue(lastCreatedUserState);
 *
 */
export let getRecoilExternalLoadable: <T>(recoilValue: RecoilValue<T>) => Loadable<T> = () => null as any;

/**
 * Retrieves the value from the loadable. More information about loadables are here:
 * https://recoiljs.org/docs/api-reference/core/Loadable
 * @param recoilValue Recoil value to retrieve its base value
 */
export function getRecoilExternalValue<T>(recoilValue: RecoilValue<T>): T {
	return getRecoilExternalLoadable<T>(recoilValue).getValue();
}

/**
 * Sets a Recoil state value, from anywhere in the app.
 *
 * Can be used outside of the React tree (outside a React component), such as in utility scripts, etc.
 *
 * <RecoilExternalStatePortal> must have been previously loaded in the React tree, or it won't work.
 * Initialized as a dummy function "() => null", it's reference is updated to a proper Recoil state mutator when GlobalStateInfluencer is loaded.
 *
 * NOTE - Recoil value isn't fully changed until some time later.
 *
 * @example setRecoilExternalState(lastCreatedUserState, newUser)
 */
export let setRecoilExternalValue: <T>(
	recoilState: RecoilState<T>,
	valOrUpdater: ((currVal: T) => T) | T
) => void = () => null as any;

export const GlobalStateInfluencer: React.FC = () => {
	useRecoilCallback(({ set, snapshot }) => {
		setRecoilExternalValue = set;
		getRecoilExternalLoadable = snapshot.getLoadable;
		return async () => {};
	})();

	// We need to update the getRecoilExternalLoadable every time there's a new snapshot
	// Otherwise we will load old values from when the component was mounted
	useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
		getRecoilExternalLoadable = snapshot.getLoadable;
	});

	return null;
};

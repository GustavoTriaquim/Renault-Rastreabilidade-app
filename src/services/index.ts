import AsyncStorage from '@react-native-async-storage/async-storage';

import { createServices } from './create-services';
import { Repository, systemClock } from './repository';
import { buildSeedDatabase } from './seed';

/** Serviços do app: dados simulados persistidos no AsyncStorage. */
export const services = createServices(
  new Repository(AsyncStorage, buildSeedDatabase, systemClock),
  AsyncStorage,
);

export type { Services } from './create-services';
export type { Result, ServiceError, ServiceErrorCode } from './result';

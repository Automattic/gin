import { Deed } from '../../types';
import StubDeed from './stubDeed';
import StubStore from './stub-store';
import Store from '../../store/store';

type ThisDeed = (deed: Deed | string) => StubDeed;
const thisDeed: ThisDeed = deedOrName => new StubDeed(deedOrName);

type WithCargo = (cargo: Record<string, any>) => StubStore;
const withCargo: WithCargo = cargo => new StubStore().withCargo(cargo);
type WithDeeds = (deeds: (string | Deed)[], override?: Record<string, any>) => StubStore;
const withDeeds: WithDeeds = (deeds, override) => new StubStore().withDeeds(deeds, override);

const stores = {
  withCargo,
  withDeeds,
  reset: Store.TestStore.reset,
  resetCalls: Store.TestStore.resetCalls,
};

const stub = {
  thisDeed,
  stores,
};

export default stub;

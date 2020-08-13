import Store from '../../store/store';
import { Deed } from '../../types';
import TestStore from '../test-store';

type WithCargo = (cargo: Record<string, any>) => StubStore;
type WithDeeds = (deeds: (string | Deed)[], override?: Record<string, any>) => StubStore;
type AndExpose = () => TestStore;

export default class StubStore {
  public withCargo: WithCargo = (cargo = {}) => {
    Store.TestStore.setCargo(cargo);
    return this;
  };

  public withDeeds: WithDeeds = (deeds = [], override = {}) => {
    Store.TestStore.setDeeds(deeds, override);
    return this;
  };

  public andExpose: AndExpose = () => {
    return Store.TestStore;
  };
}

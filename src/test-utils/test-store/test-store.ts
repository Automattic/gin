import { DeedTypes, Deed } from '../../types';
import StubDeed from '../stub/stubDeed';

interface Call {
  count: number;
  [index: number]: {
    args: any[];
  };
}

function getCargo(): Record<string, any> {
  return this.cargo;
}
function getDeeds(): Record<string, (...args: any) => any> {
  return this.deeds;
}
function unsubscribe(): void {
  return null;
}
function setCargo(cargo: Record<string, any> = {}): void {
  this.cargo = cargo;
}
function setDeeds(deeds: (string | Deed)[] = [], override: Record<string, any> = {}): void {
  this.deeds = deeds.reduce((acc, nameOrDeed) => {
    let name = '';
    let isStubDeed = false;

    if (typeof nameOrDeed !== 'string' && nameOrDeed.getProperties) {
      name = nameOrDeed.getProperties().name;
      isStubDeed = nameOrDeed.deedType === DeedTypes.stub;
    } else {
      name = nameOrDeed as string;
    }

    this.calls[name] = {
      count: 0,
    };
    acc[name] = (...args) => {
      this.calls[name][this.calls[name].count] = { args };
      this.calls[name].count += 1;

      // Call the override if provided
      if (override[name]) {
        return override[name](...args);
      }

      // Let stub deeds work as expected
      if (isStubDeed) {
        return (nameOrDeed as StubDeed).getProperties().stub(...args);
      }

      return null;
    };
    return acc;
  }, {});
}

function reset(): void {
  this.cargo = this.deeds = this.calls = {};
}

function resetCalls(): void {
  Object.keys(this.calls).forEach(name => {
    this.calls[name] = { count: 0 };
  });
}

class TestStore {
  public calls: Record<string, Call> = {};

  public getCargo: typeof getCargo;
  public getDeeds: typeof getDeeds;
  public unsubscribe: typeof unsubscribe;
  public setCargo: typeof setCargo;
  public setDeeds: typeof setDeeds;

  public reset: typeof reset;

  public resetCalls: typeof resetCalls;

  // @ts-ignore
  private cargo: Record<string, any> = {};
  // @ts-ignore
  private deeds: Record<string, any> = {};

  constructor() {
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'test') {
      // Disallows this functionality outside of a test environment
      this.getCargo = getCargo.bind(this);
      this.getDeeds = getDeeds.bind(this);
      this.unsubscribe = unsubscribe.bind(this);
      this.setCargo = setCargo.bind(this);
      this.setDeeds = setDeeds.bind(this);
      this.reset = reset.bind(this);
      this.resetCalls = resetCalls.bind(this);
    }
  }
}

export default TestStore;

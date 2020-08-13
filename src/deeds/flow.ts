import { DeedTypes, Trigger, Deed, ArgSource } from '../types';

// tslint:disable-next-line: class-name
interface flow {
  called: FlowDeedFactory;
}

type FlowDeedFactory = (name: string) => FlowDeed;

type AdvanceOn = (trigger: keyof typeof Trigger) => FlowDeed;
type StartWith = (deed: Deed | Deed[]) => FlowDeed;
type ThenCall = (deed: Deed | Deed[]) => FlowDeed;
type WithOriginalArgs = () => FlowDeed;
type MapsTo = (transform: (...args: any) => any) => FlowDeed;

export interface FlowProperties {
  name: FlowDeed['_name'];
  triggers: FlowDeed['_triggers'];
  queue: FlowDeed['_deedQueue'];
  argSources: FlowDeed['_argSources'];
  transforms: FlowDeed['_transforms'];
}

type GetProperties = () => FlowProperties;

const defaultTransform: (...args: any) => any = (...args) => args;

export class FlowDeed {
  public deedType: string = DeedTypes.flow;
  private _name: string;
  private _deedQueue: (Deed | Deed[])[] = [];
  private _triggers: (keyof typeof Trigger)[] = [];
  private _argSources: (keyof typeof ArgSource)[] = [];
  private _transforms: ((...args: any) => any)[] = [];

  constructor(name: string) {
    this._name = name;
  }

  // Set the previous trigger
  public whichAdvancesOn: AdvanceOn = trigger => {
    this._triggers[this._triggers.length - 1] = trigger;
    return this;
  };

  // Set the next deed or deeds[] with a default trigger of "done"
  public thatStartsWith: StartWith = deed => {
    this._deedQueue.push(deed as any);
    this._triggers.push(Trigger.done);
    this._argSources.push(ArgSource.lastCalled);
    this._transforms.push(defaultTransform);
    return this;
  };

  // Alias for thatStartsWith - makes more lexical sense to be called this
  // tslint:disable member-ordering
  public andThenCalls: ThenCall = this.thatStartsWith;

  public withOriginalArgs: WithOriginalArgs = () => {
    this._argSources[this._argSources.length - 1] = ArgSource.original;
    return this;
  };

  public whichMapsTo: MapsTo = transform => {
    this._transforms[this._transforms.length - 1] = transform;
    return this;
  };

  public getProperties: GetProperties = () => {
    return {
      name: this._name,
      triggers: this._triggers,
      queue: this._deedQueue,
      argSources: this._argSources,
      transforms: this._transforms,
    };
  };
}

const flowDeedFactory: FlowDeedFactory = name => {
  return new FlowDeed(name);
};

const flow: flow = {
  called: name => flowDeedFactory(name),
};
export default flow;

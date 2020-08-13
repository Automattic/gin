import { DeedTypes, ActionFunction } from '../types';

// tslint:disable-next-line: class-name
interface action {
  called: ActionDeedFactory;
}

type ActionDeedFactory = (name: string) => ActionDeed;
type ActionDeedFunction = (actionFunc: ActionFunction) => ActionDeed;

export interface ActionProperties {
  name: ActionDeed['_name'];
  action: ActionDeed['_action'];
}

type GetProperties = () => ActionProperties;

export class ActionDeed {
  public deedType: string = DeedTypes.action;
  private _name: string;
  private _action: ActionFunction;

  constructor(name: string) {
    this._name = name;
  }
  public thatDoes: ActionDeedFunction = actionFunc => {
    if (typeof actionFunc !== 'function') {
      throw Error('Argument passed to .thatDoes must be a function');
    }
    this._action = actionFunc;
    return this;
  };

  public getProperties: GetProperties = () => {
    return { name: this._name, action: this._action };
  };
}

const actionDeedFactory: ActionDeedFactory = name => {
  return new ActionDeed(name);
};

const action: action = {
  called: name => actionDeedFactory(name),
};
export default action;

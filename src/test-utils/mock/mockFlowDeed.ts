import { Deed, DeedTypes, ArgsType, FlowMethods } from '../../types';

// Map public method names to private attribute names
const publicToPrivate = {
  whichMapsTo: '_transforms',
};
type Methods = FlowMethods;

type ThisDeed = (deed: Deed) => MockFlowDeed;
type WithArgs = (...args: ArgsType) => MockFlowDeed;

type AssertFunction = (resultFromMock: any) => any;
type ThenAssert = (assertFunction: AssertFunction) => void;
type AtIndex = (index: number) => MockFlowDeed;

interface AttrFromMock {
  _method: Methods;
}

class MockFlowDeed {
  private _deed: Deed;
  private _args: ArgsType = [];
  private _method: FlowMethods;
  private _index: number = 0;

  constructor(attr: AttrFromMock) {
    Object.keys(attr).map(prop => (this[prop] = attr[prop]));
  }

  public fromThisDeed: ThisDeed = deed => {
    if (!DeedTypes[deed.deedType]) {
      throw Error(`mock.deed must be passed a Deed, you passed a ${typeof deed}`);
    }
    this._deed = deed;
    return this;
  };

  public withArgs: WithArgs = (...args) => {
    this._args = args;
    return this;
  };

  public atThisStage: AtIndex = index => {
    this._index = index;
    return this;
  };

  public thenAssert: ThenAssert = assert => {
    const deedMethod = this._deed[publicToPrivate[this._method]][this._index];
    if (typeof assert !== 'function') {
      throw Error('Assertion must be a function');
    }
    return assert(deedMethod(...this._args));
  };
}

export default MockFlowDeed;

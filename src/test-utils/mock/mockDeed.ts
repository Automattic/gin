import {
  ActionExtras,
  RequestExtras,
  FetchExtras,
  ActionMethods,
  RequestMethods,
  FetchMethods,
  Deed,
  DeedTypes,
  ArgsType,
} from '../../types';

// Map public method names to private attribute names
const publicToPrivate = {
  hits: '_path',
  withQueryParams: '_queryParams',
  withBody: '_body',
  withJSON: '_json',
  withConfig: '_config',
  afterwards: '_after',
  thenDoes: '_action',
  thatDoes: '_action',
  catchError: '_catchError',
};
type Extras = ActionExtras | RequestExtras | FetchExtras;
type Methods = ActionMethods | RequestMethods | FetchMethods;

type ThisDeed<T> = (deed: Deed) => MockDeed<T>;
type WithExtras<T> = (extras: T) => MockDeed<T>;
type WithArgs<T> = (...args: ArgsType) => MockDeed<T>;

type AssertFunction = (resultFromMock: any) => any;
type ThenAssert<T> = (assertFunction: AssertFunction) => void;

interface AttrFromMock {
  _method: Methods;
}

// T is determined by the method passed to 'mock.thisCall'
class MockDeed<T extends Extras> {
  private _deed: Deed;
  private _extras: T = undefined;
  private _args: ArgsType = [];
  private _method: ActionMethods | RequestMethods | FetchMethods;

  constructor(attr: AttrFromMock) {
    Object.keys(attr).map(prop => (this[prop] = attr[prop]));
  }

  public fromThisDeed: ThisDeed<T> = deed => {
    if (!DeedTypes[deed.deedType]) {
      throw Error(`mock.deed must be passed a Deed, you passed a ${typeof deed}`);
    }
    this._deed = deed;
    return this;
  };

  public withExtras: WithExtras<T> = extras => {
    this._extras = extras;
    return this;
  };

  public withArgs: WithArgs<T> = (...args) => {
    this._args = args;
    return this;
  };
  public thenAssert: ThenAssert<T> = assert => {
    const deedMethod = this._deed[publicToPrivate[this._method]];

    // If you call hits as a function vs hits as a string
    if (typeof deedMethod === 'function') {
      return assert(deedMethod(this._extras, ...this._args));
    }
    return deedMethod;
  };
}

export default MockDeed;

import { Deed, DeedTypes } from '../../types';

export interface StubProperties {
  name: StubDeed['_name'];
  stub: StubDeed['_stub'];
}
type GetProperties = () => StubProperties;

type StubFunction = (...args: any) => any;
type WithThis = (stubFunction: StubFunction) => StubDeed;

class StubDeed {
  public deedType: string = DeedTypes.stub;
  private _name: string;
  private _stub: StubFunction;

  constructor(deedOrName: Deed | string) {
    if (typeof deedOrName === 'string') {
      this._name = deedOrName;
    } else if (deedOrName.deedType) {
      this._name = deedOrName.getProperties().name;
    } else {
      throw Error(
        `stub.thisDeed accepts either a string or a deed, you passed a ${typeof deedOrName}`,
      );
    }
  }

  public withThis: WithThis = stubFunction => {
    this._stub = stubFunction;
    return this;
  };

  public getProperties: GetProperties = () => ({
    name: this._name,
    stub: this._stub,
  });
}

export default StubDeed;

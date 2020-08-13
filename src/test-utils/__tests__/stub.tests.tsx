import Store from '../../store/store';
import deed from '../../deeds';
import stub from '../stub';

const requestDeed = deed.request
  .called('test')
  .hits('/test')
  .withVerb('GET')
  .withQueryParams((extras, e) => ({ [e]: true }));

describe('stub', () => {
  const testFn = jest.fn();

  beforeAll(() => {
    window.fetch = () => null;
  });

  beforeEach(jest.resetAllMocks);

  describe('deed', () => {
    it('successfully stubs with a string', () => {
      const testDeed = stub.thisDeed('test').withThis(testFn);
      const store = new Store({
        cargo: {},
        deeds: [testDeed],
      });

      store._deeds.test();
      expect(testFn).toHaveBeenCalled();
      expect(testDeed.getProperties()).toEqual({
        name: 'test',
        stub: testFn,
      });
    });

    it('successfully stubs with a deed', () => {
      const testDeed = stub.thisDeed(requestDeed).withThis(testFn);
      const store = new Store({
        cargo: {},
        deeds: [testDeed],
      });

      store._deeds.test();
      expect(testFn).toHaveBeenCalled();
    });

    it('throws when not passed a deed', () => {
      expect(() => stub.thisDeed((4 as unknown) as string).withThis(testFn)).toThrow();
    });
  });

  describe('stores', () => {
    it('handles withCargo', () => {
      const spy = jest.spyOn(Store.TestStore, 'setCargo');
      stub.stores.withCargo({ test: true });
      expect(spy).toHaveBeenLastCalledWith({ test: true });
      // @ts-ignore - testing stub-store default params
      stub.stores.withCargo();
      expect(spy).toHaveBeenLastCalledWith({});
    });

    it('handles withDeeds', () => {
      const spy = jest.spyOn(Store.TestStore, 'setDeeds');
      stub.stores.withDeeds(['deed']);
      expect(spy).toHaveBeenCalledWith(['deed'], {});

      // @ts-ignore - testing stub-store default params
      stub.stores.withDeeds();
      expect(spy).toHaveBeenLastCalledWith([], {});
    });

    it('handles andExpose', () => {
      const store = stub.stores.withDeeds(['deed']).andExpose();
      expect(store).toBe(Store.TestStore);
    });
  });
});

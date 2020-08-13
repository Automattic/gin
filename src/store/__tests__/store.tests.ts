// tslint:disable: no-string-literal
import Store from '../store';
import deed from '../../deeds';
import Subscriber from '../subscriber';
import { BatchMode } from '../../types';

const testDeeds = [
  deed.action.called('action').thatDoes(() => ({})),
  deed.request.called('request').hits('/test'),
];

describe('Store', () => {
  beforeAll(() => {
    // @ts-ignore
    window.fetch = async () => ({
      ok: true,
      headers: {
        get: () => 'application/javascript',
      },
      json: () => ({}),
    });
  });

  describe('props', () => {
    it('handles defaults', () => {
      const store = new Store();
      expect(store).toBeDefined();
    });

    it('handles name', () => {
      const store = new Store({ cargo: {}, deeds: [], name: 'test-store' });
      expect(store).toBeDefined();
      expect(store.getName()).toEqual('test-store');
      store.disconnect();

      const store2 = new Store({ cargo: {}, deeds: [], name: () => 'test-store' });
      expect(store).toBeDefined();
      expect(store.getName()).toEqual('test-store');
      store2.disconnect();
    });

    it('throws when name is not a string', () => {
      try {
        // @ts-ignore
        const s = new Store({ cargo: {}, deeds: [], name: 42 });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('throws when subscribing to an unregistered store', () => {
      try {
        new Subscriber({ storeNames: ['store'], selector: () => null }).subscribe();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('handles customFetch', () => {
      const store = new Store({ cargo: {}, deeds: [], customFetch: true });
      expect(store).toBeDefined();
    });

    it('handles two stores with the same name', () => {
      const mockFn = jest.fn();
      try {
        const store = new Store({ cargo: {}, deeds: [], name: 'test-store' });
        const store2 = new Store({ cargo: {}, deeds: [], name: 'test-store' });
      } catch (e) {
        mockFn();
      }
      expect(mockFn).not.toBeCalled();
    });

    it('handles publishing', () => {
      const testFn = jest.fn();
      Store.watch(testFn);
      const store = new Store({ cargo: {}, deeds: [], name: 'test-store' });
      const sub = new Subscriber({ selector: cargo => cargo, storeNames: ['test-store'] });
      Store.unwatch(testFn);
      expect(testFn).toHaveBeenCalled();
      expect(Store.watchers.length).toEqual(0);
    });

    it('handles a batchTime of 0', () => {
      const store = new Store({ cargo: {}, deeds: [], batchTime: 0 });
      expect(store['_isBatchless']).toEqual(true);
    });

    it('handles a batchTime of not 0', () => {
      const store = new Store({ cargo: {}, deeds: [], batchTime: 1000 });
      expect(store['_isBatchless']).toEqual(false);
    });
  });

  describe('deeds', () => {
    it('handles a valid deeds array', () => {
      const store = new Store({ cargo: {}, deeds: testDeeds });
      expect(store).toBeDefined();
    });

    it('throws Error with invalid deed', () => {
      // @ts-ignore
      expect(() => new Store({ cargo: {}, deeds: [{ invalid: true }] })).toThrow();
    });

    it('throws Error when an action deed has duplicate name', () => {
      expect(
        () =>
          new Store({ cargo: {}, deeds: [deed.action.called('deed'), deed.action.called('deed')] }),
      ).toThrow();
    });

    it('throws Error when a request deed has duplicate name', () => {
      expect(
        () =>
          new Store({
            cargo: {},
            deeds: [deed.request.called('deed'), deed.request.called('deed')],
          }),
      ).toThrow();
    });
  });

  describe('update flow', () => {
    const testFn = jest.fn();

    beforeEach(() => {
      jest.useFakeTimers();
      testFn.mockClear();
    });

    it('handles full update process', async () => {
      const store = new Store({
        cargo: { test: false },
        deeds: [deed.action.called('test').thatDoes(() => ({ test: true }))],
      });

      expect(store['_cargo']).toEqual({ test: false });
      await store['_deeds'].test();
      jest.runAllTimers();

      expect(store['_cargo']).toEqual({ test: true });
    });

    it('handles full update process with deep merge', async () => {
      const store = new Store({
        cargo: { test: { foo: 'bar' } },
        deeds: [deed.action.called('test').thatDoes(() => ({ test: { foobar: 'baz' } }))],
        batchMode: BatchMode.DEEP,
      });

      expect(store['_cargo']).toEqual({ test: { foo: 'bar' } });
      await store['_deeds'].test();
      jest.runAllTimers();

      expect(store['_cargo']).toEqual({ test: { foo: 'bar', foobar: 'baz' } });
    });

    it('handles full update process with debug mode', async () => {
      const origConsoleLog = global.console.log;
      global.console.log = jest.fn();

      const store = new Store({
        cargo: { test: false },
        deeds: [deed.action.called('test').thatDoes(() => ({ test: true }))],
        name: 'store',
        debug: true,
      });

      expect(store['_cargo']).toEqual({ test: false });
      await store['_deeds'].test();

      // hit all types of debug logs
      // @ts-ignore
      store['_debugLog']({ message: true }, 'red', 'test');
      store['_storeName'] = undefined;
      store['_debugLog']('x');

      jest.runAllTimers();

      expect(store['_cargo']).toEqual({ test: true });
      expect(global.console.log).toHaveBeenCalledTimes(5);

      global.console.log = origConsoleLog;
    });

    it('handles batching', async () => {
      const store = new Store({
        cargo: { count: 0 },
        deeds: [deed.action.called('test').thatDoes((xt, count) => ({ count }))],
      });

      expect(store['_cargo']).toEqual({ count: 0 });

      // Ensure batch gets hit with both
      await store['_deeds'].test(1);
      await store['_deeds'].test(2);

      jest.runAllTimers();

      expect(store['_cargo']).toEqual({ count: 2 });
    });

    it('skips batching when batchless', async () => {
      const store = new Store({
        cargo: { count: 0 },
        deeds: [deed.action.called('test').thatDoes((xt, count) => ({ count }))],
        batchTime: 0,
      });
      // @ts-ignore
      const spy = jest.spyOn(store, '_startTimer');

      expect(store['_cargo']).toEqual({ count: 0 });

      // Ensure batch gets hit with both
      await store['_deeds'].test(1);
      await store['_deeds'].test(2);

      jest.runAllTimers();

      expect(store['_cargo']).toEqual({ count: 2 });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('handles an unsubscribe', () => {
      const store = new Store({ cargo: {}, deeds: [] });
      const id = Symbol();
      store.subscribe(id, undefined);
      store.unsubscribe(id);
      expect(store['_subs'].has(id)).toEqual(false);
    });

    it('handles a disconnect', () => {
      const store = new Store({ cargo: {}, deeds: [], name: 'store' });

      store.disconnect();

      expect(Store.namedStores.has('store')).toEqual(false);
      expect(() => store['_deeds'].someDeed()).not.toThrow();
    });
  });

  describe('updateCargo', () => {
    it('triggers a shipment', async () => {
      const store = new Store({ cargo: {}, deeds: [], batchTime: 0 });
      store.updateCargo({ new: true });
      jest.runAllTimers();
      expect(store['_cargo']).toEqual({ new: true });
    });
  });

  describe('misc', () => {
    it('handles store shutdown when deed is running', async () => {
      jest.useFakeTimers();
      const delay = () =>
        new Promise(resolve => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            resolve();
          }, 1000);
        });

      const delayDeed = deed.action.called('delay').thatDoes(async () => {
        await delay();
        return { foo: 'bar' };
      });
      const store = new Store({
        cargo: {},
        deeds: [delayDeed],
        batchTime: 0,
      });

      try {
        store['_deeds'].delay();
        store.disconnect();
        jest.runAllTimers();
        expect(store['_cargo']).toEqual(null);
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('handles missing action deed process', async () => {
      jest.useFakeTimers();

      const testDeed = deed.action.called('test').thatDoes(async () => {
        return { foo: 'bar' };
      });

      const store = new Store({
        cargo: {},
        deeds: [testDeed],
        batchTime: 1000,
      });

      try {
        store['_processes'].clear();
        store['_deeds'].test();
        jest.runAllTimers();
        expect(store['_cargo']).toEqual({});
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('handles missing request deed process', async () => {
      jest.useFakeTimers();

      const testDeed = deed.request
        .called('test')
        .hits('')
        .withConfig(() => ({}));

      const store = new Store({
        cargo: {},
        deeds: [testDeed],
        batchTime: 1000,
      });

      try {
        store['_processes'].clear();
        store['_deeds'].test();
        store['_processes'].clear();

        jest.runAllTimers();
        expect(store['_cargo']).toEqual({});
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('handles missing flow deed process', async () => {
      jest.useFakeTimers();

      const testDeed = deed.flow.called('test');

      const store = new Store({
        cargo: {},
        deeds: [testDeed],
        batchTime: 1000,
      });

      try {
        store['_processes'].clear();
        store['_deeds'].test();
        store['_processes'].clear();

        jest.runAllTimers();
        expect(store['_cargo']).toEqual({});
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('exposes methods on assignment', () => {
      const store = new Store({ name: 'store', cargo: {}, deeds: [] });
      const cargo = Store.namedStores.get('store').getCargo();
      const deeds = Store.namedStores.get('store').getDeeds();
      const px = Store.namedStores.get('store').getPx();
      expect(cargo).toEqual({});
      expect(deeds).toEqual({});
      expect(px).toEqual(expect.any(Map));
    });

    it('handles mock and unmock', () => {
      Store.mock();
      expect(Store['_assign']).toBeDefined();
      expect(Store.assign(null, null).to(null)).toBe(Store.TestStore);

      Store.unmock();
      expect(Store['_assign']).toBeUndefined();
      expect(() => Store.assign(null, null).to(null)).toThrow();
    });
  });
});

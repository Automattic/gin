import deed from '../../deeds';
import Store from '../store';

describe('Store', () => {
  const mockFn = jest.fn();

  beforeAll(() => {
    window.fetch = () => null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('action deeds', () => {
    it('handles basic action deed', async () => {
      const action = deed.action.called('action').thatDoes(mockFn);
      const storeClass = new Store({ cargo: {}, deeds: [action], name: 'store' });
      const spy = jest.spyOn(storeClass, '_enqueue');
      const store = Store.assign(Symbol, () => null).to('store');
      await store.getDeeds().action();

      expect(mockFn).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('handles action deed with skipShipment', async () => {
      const action = deed.action.called('action').thatDoes(({ skipShipment }) => {
        skipShipment();
        mockFn();
      });
      const storeClass = new Store({ cargo: {}, deeds: [action], name: 'store' });
      const spy = jest.spyOn(storeClass, '_enqueue');
      const store = Store.assign(Symbol, () => null).to('store');
      await store.getDeeds().action();

      expect(mockFn).toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("doesn't throw when action throws and handles", async () => {
      const action = deed.action.called('action').thatDoes(() => {
        const foo = null;
        try {
          foo();
        } catch (e) {
          mockFn();
        }
      });
      const storeClass = new Store({ cargo: {}, deeds: [action], name: 'store' });
      const store = Store.assign(Symbol, () => null).to('store');
      await store.getDeeds().action();

      expect(mockFn).toHaveBeenCalled();
    });

    it("throws when action throws and doesn't handle", async () => {
      const action = deed.action.called('action').thatDoes(() => {
        const foo = null;
        foo();
        mockFn();
      });
      const storeClass = new Store({ cargo: {}, deeds: [action], name: 'store' });
      const store = Store.assign(Symbol, () => null).to('store');

      try {
        await store.getDeeds().action();
      } catch (e) {
        expect(e).toBeDefined();
      }

      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});

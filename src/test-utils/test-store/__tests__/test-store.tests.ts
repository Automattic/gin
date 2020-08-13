import TestStore from '../test-store';
import stub from '../../stub';

describe('TestStore', () => {
  it('handles getCargo', () => {
    const store = new TestStore();
    expect(store.getCargo()).toEqual({});
  });

  it('handles getDeeds', () => {
    const store = new TestStore();
    expect(store.getDeeds()).toEqual({});
  });

  it('handles getDeeds', () => {
    const store = new TestStore();
    expect(store.getDeeds()).toEqual({});
  });

  it('handles unsubscribe', () => {
    const store = new TestStore();
    expect(store.unsubscribe()).toEqual(null);
  });

  it('handles reset', () => {
    const store = new TestStore();
    store.setCargo({ test: true });
    store.reset();
    expect(store.getCargo()).toEqual({});
  });

  it('handles resetCalls', () => {
    const store = new TestStore();
    store.setCargo({ test: true });
    store.setDeeds(['deed']);
    store.getDeeds().deed();

    expect(store.calls.deed.count).toEqual(1);
    store.resetCalls();

    // resets calls
    expect(store.calls.deed.count).toEqual(0);

    // does not reset cargo or deeds
    expect(store.getCargo()).toEqual({ test: true });
  });

  it('handles setCargo', () => {
    const store = new TestStore();

    // default
    store.setCargo();
    expect(store.getCargo()).toEqual({});

    store.setCargo({ test: true });
    expect(store.getCargo()).toEqual({ test: true });
  });

  it('handles setDeeds', () => {
    const store = new TestStore();

    // default
    store.setDeeds();
    expect(store.getDeeds()).toEqual({});

    // string
    store.setDeeds(['deed']);
    expect(store.getDeeds()).toEqual({ deed: expect.any(Function) });

    const testFn = jest.fn();

    // stub deed
    store.setDeeds([stub.thisDeed('deed').withThis(testFn)]);
    store.getDeeds().deed();
    expect(store.getDeeds()).toEqual({ deed: expect.any(Function) });
    expect(testFn).toHaveBeenCalledTimes(1); // keeps the stub implementation

    // override
    store.setDeeds(['deed'], { deed: testFn });
    store.getDeeds().deed();
    expect(store.getDeeds()).toEqual({ deed: expect.any(Function) });
    expect(testFn).toHaveBeenCalledTimes(2); // uses the override
  });
});

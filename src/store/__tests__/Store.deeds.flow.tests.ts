import deed from '../../deeds';
import Store from '../store';

const headers = {
  'content-type': 'application/json',
  get: prop => headers[prop],
};
window.fetch = jest.fn(async () => ({
  headers,
  ok: true,
  json: () => ({
    test: true,
  }),
}));

const action = deed.action.called('action').thatDoes(() => ({ test: true }));
const request = deed.request.called('request').hits('test');

describe('Flow Deeds', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('simple single action', async () => {
    const fd = deed.flow.called('flow').thatStartsWith(action);

    const storeClass = new Store({
      cargo: {},
      deeds: [fd],
      name: 'store',
    });

    const store = Store.assign(Symbol, () => null).to('store');

    const flowSpy = jest.spyOn(storeClass, '_moveThroughFlow');
    await store.getDeeds().flow();
    jest.runAllTimers();
    expect(flowSpy).toHaveBeenCalledTimes(1);
  });

  it('throws on invalid deed', async () => {
    const fd = deed.flow.called('flow').thatStartsWith(undefined);

    try {
      const storeClass = new Store({
        cargo: {},
        deeds: [fd],
        name: 'store',
      });
    } catch (error) {
      expect(error).toEqual(Error('flow deed flow was passed an invalid deed'));
    }
  });

  it('simple single request', async () => {
    const fd = deed.flow.called('flow').thatStartsWith(request);

    const storeClass = new Store({
      cargo: {},
      deeds: [fd],
      name: 'store',
    });

    const store = Store.assign(Symbol, () => null).to('store');

    const flowSpy = jest.spyOn(storeClass, '_moveThroughFlow');
    await store.getDeeds().flow();
    jest.runAllTimers();
    expect(flowSpy).toHaveBeenCalledTimes(1);
  });

  it('simple multi action', async () => {
    const fd = deed.flow.called('flow').thatStartsWith([action, request]);

    const storeClass = new Store({
      cargo: {},
      deeds: [fd],
      name: 'store',
    });

    const store = Store.assign(Symbol, () => null).to('store');

    const flowSpy = jest.spyOn(storeClass, '_moveThroughFlow');
    await store.getDeeds().flow();
    jest.runAllTimers();
    expect(flowSpy).toHaveBeenCalledTimes(1);
  });

  it('nested flow action', async () => {
    const fd = deed.flow.called('flow').thatStartsWith([action]);
    const flow = deed.flow
      .called('xFlow')
      .thatStartsWith(fd)
      .whichAdvancesOn('shipment')
      .andThenCalls(action)
      .withOriginalArgs()
      .whichMapsTo(() => 4)
      .andThenCalls(action);

    const storeClass = new Store({
      cargo: {},
      deeds: [flow],
      name: 'store',
    });

    const store = Store.assign(Symbol, () => null).to('store');

    const flowSpy = jest.spyOn(storeClass, '_moveThroughFlow');
    await store.getDeeds().xFlow();
    jest.runAllTimers();
    expect(flowSpy).toHaveBeenCalledTimes(2);
  });
});

import Subscriber from '../subscriber';
import Store from '../store';

describe('Subscriber', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('::constructor', () => {
    const sub = new Subscriber({ selector: () => null, storeNames: ['name'] });
    expect(sub.storeNames).toEqual(['name']);
    expect(sub.selector).toEqual(expect.any(Function));
  });

  it('::subscribe', () => {
    const cargo = { foo: 'bar', nope: false };
    const toFn = jest.fn(name => ({
      getCargo: () => cargo,
      getDeeds: () => ({ test: true }),
    }));

    const assignSpy = jest.spyOn(Store, 'assign').mockImplementationOnce((id, handler) => ({
      to: toFn,
    }));

    const sub = new Subscriber({ selector: ({ foo }) => ({ foo }), storeNames: ['name'] });

    const emitSpy = jest.spyOn(sub, 'emit');

    sub.subscribe();

    expect(assignSpy).toHaveBeenCalledWith(sub.identity, expect.any(Function));
    expect(toFn).toHaveBeenCalledWith('name');
    expect(sub.cargo).toEqual({ foo: 'bar' });
    expect(sub.deeds).toEqual({ test: true });
    expect(emitSpy).toHaveBeenCalledWith('subscribe', {
      cargo: { foo: 'bar' },
      deeds: { test: true },
    });
  });

  it('::unsubscribeAll', () => {
    const sub = new Subscriber({ selector: () => null, storeNames: ['name'] });
    const mockSubscription = {
      unsubscribe: jest.fn(),
    };

    sub.subscriptions.set('name', mockSubscription);
    sub.listeners.set('name', mockSubscription);
    const emitSpy = jest.spyOn(sub, 'emit');

    sub.unsubscribeAll();

    expect(sub.subscriptions.size).toEqual(0);
    expect(sub.listeners.get('name')).toBeUndefined();
    expect(mockSubscription.unsubscribe).toHaveBeenCalledWith(sub.identity);
    expect(emitSpy).toHaveBeenCalledWith('unsubscribe');
  });

  it('::on', () => {
    const sub = new Subscriber({ selector: () => null, storeNames: ['name'] });
    const mockFn = jest.fn();
    sub.on('subscribe', mockFn);
    expect(sub.listeners.get('subscribe')[0]).toEqual(mockFn);
  });

  it('::emit', () => {
    const sub = new Subscriber({ selector: () => null, storeNames: ['name'] });
    const mockFn = jest.fn();
    sub.on('subscribe', mockFn);
    sub.emit('subscribe', 'payload');
    expect(mockFn).toHaveBeenCalledWith('payload');
  });

  it('::select', () => {
    const sub = new Subscriber({ selector: ({ foo }) => ({ foo }), storeNames: ['name'] });
    expect(sub.select({ foo: true, bar: false })).toEqual({ foo: true });
  });

  it('::handleUpdate', async () => {
    jest.useFakeTimers();
    const sub = new Subscriber({ selector: cargo => cargo, storeNames: ['name'] });
    const emitSpy = jest.spyOn(sub, 'update');
    sub.isSubscribed = true;

    // Equal payload
    await sub.handleUpdate({});
    jest.runAllTimers();
    expect(emitSpy).not.toHaveBeenCalled();

    // Different payload
    await sub.handleUpdate({ foo: 'bar' });
    jest.runAllTimers();
    expect(emitSpy).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('::handleUpdate unsubscribed', async () => {
    jest.useFakeTimers();
    const sub = new Subscriber({ selector: cargo => cargo, storeNames: ['name'] });
    const emitSpy = jest.spyOn(sub, 'update');

    // Equal payload
    await sub.handleUpdate({});
    jest.runAllTimers();
    expect(emitSpy).not.toHaveBeenCalled();

    // Different payload
    await sub.handleUpdate({ foo: 'bar' });
    jest.runAllTimers();
    expect(emitSpy).not.toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('::update', () => {
    const sub = new Subscriber({ selector: cargo => cargo, storeNames: ['name'] });
    const emitSpy = jest.spyOn(sub, 'emit');

    sub.update({ foo: 'bar' });

    expect(sub.cargo).toEqual({ foo: 'bar' });
    expect(emitSpy).toHaveBeenCalledWith('update', { foo: 'bar' });
  });
});

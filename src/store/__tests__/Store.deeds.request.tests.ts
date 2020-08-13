import Store from '../store';
import deed from '../../deeds';

describe('Store', () => {
  describe('request deeds', () => {
    describe('valid requests', () => {
      beforeEach(() => {
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
      });

      it('handles basic GET and HEAD request', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET'),
            deed.request
              .called('head')
              .hits('https://test')
              .withVerb('HEAD'),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');

        await store.getDeeds().get();
        await store.getDeeds().head();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          method: 'GET',
        });
        expect(window.fetch).toHaveBeenNthCalledWith(2, 'https://test', {
          method: 'HEAD',
        });
      });

      it('handles functional hits path', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits(() => {
                return 'function_path';
              })
              .withVerb('GET')
              .withQueryParams(() => ({
                test: true,
              })),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');

        await store.getDeeds().get();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'function_path?test=true', {
          method: 'GET',
        });
      });

      it('handles withQueryParams', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .withQueryParams(() => ({
                test: true,
                undefinedShouldNotBeSet: undefined,
              })),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');

        await store.getDeeds().get();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test?test=true', {
          method: 'GET',
        });
      });

      it("throws when queryParams doesn't return an object", async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .withQueryParams(() => 4 as any),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');

        try {
          await store.getDeeds().get();
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      it('handles withConfig', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .withConfig(
                () =>
                  ({
                    test: true,
                  } as any),
              ),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          test: true,
          method: 'GET',
        });
      });

      it('handles withBody', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('post')
              .hits('test')
              .withVerb('POST')
              .withBody(() => ({
                test: true,
              })),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().post();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          method: 'POST',
          body: { test: true },
        });
      });

      it('handles withJSON', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('post')
              .hits('test')
              .withVerb('POST')
              .withJSON(() => ({
                test: true,
              })),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().post();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          method: 'POST',
          body: JSON.stringify({ test: true }),
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        });
      });

      it('handles withHeaders', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .withHeaders({
                test: 'true',
              }),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          method: 'GET',
          headers: { test: 'true' },
        });
      });

      it('handles default headers', async () => {
        Store.defaultFetchOptions.headers = {
          Accept: 'test-accept-header',
          'X-CSRF': undefined,
        };

        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET'),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();

        expect(window.fetch).toHaveBeenNthCalledWith(1, 'test', {
          method: 'GET',
          headers: { Accept: 'test-accept-header' },
        });
      });

      it('handles afterwards', async done => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .afterwards((extras, data) => {
                expect(data).toMatchObject({ test: true });
                done();
              }),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();
      });

      it('handles thenDoes', async done => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .thenDoes((extras, data) => {
                expect(data).toMatchObject({ test: true });
                done();
                return {};
              }),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();
      });
    });

    describe('invalid request', () => {
      beforeEach(() => {
        const headers = { get: prop => headers[prop] };
        window.fetch = jest.fn(async () => ({
          headers,
          ok: false,
          status: 500,
          statusText: 'error',
          url: '/test',
          json: () => ({
            test: true,
          }),
        }));
      });

      it('throws error in fetch request', async () => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('test')
              .hits('test')
              .withVerb('HEAD'),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        try {
          await store.getDeeds().test();
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      it('sends error to catchError', async done => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .catchError((extras, e) => {
                expect(e).toBeDefined();
                done();
              }),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();
      });
    });

    describe('non JSON request', () => {
      beforeEach(() => {
        const headers = { get: prop => headers[prop] };
        window.fetch = jest.fn(async () => ({
          headers,
          ok: true,
          url: '/test',
          json: () => ({
            test: true,
          }),
        }));
      });

      it('returns object with Error message', async done => {
        const storeClass = new Store({
          cargo: {},
          deeds: [
            deed.request
              .called('get')
              .hits('test')
              .withVerb('GET')
              .afterwards((extras, res) => {
                expect(res.message).toBeDefined();
                done();
              }),
          ],
          name: 'store',
        });

        const store = Store.assign(Symbol, () => null).to('store');
        await store.getDeeds().get();
      });
    });
  });
});

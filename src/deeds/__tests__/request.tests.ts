import request, { RequestDeed, setAs, HTTPVerbs } from '../request';
import { DeedTypes } from '../../types';

describe('deed.request', () => {
  describe('request', () => {
    it('.called() returns RequestDeed', () => {
      const testDeed = request.called('test');
      expect(testDeed).toBeInstanceOf(RequestDeed);
    });
  });

  describe('RequestDeed', () => {
    it('handles normal flow', () => {
      const testFn = jest.fn();
      const expected = {
        name: 'test',
        path: '/test',
        action: testFn,
        verb: 'GET',
        queryParams: testFn,
        body: testFn,
        json: testFn,
        after: testFn,
        catchError: testFn,
        config: testFn,
        headers: {},
      };

      const TestDeed = new RequestDeed('test');
      const td = TestDeed.hits(expected.name);
      expect(td).toBe(TestDeed);
      expect(TestDeed.deedType).toEqual(DeedTypes.request);
      TestDeed.hits(expected.path);
      TestDeed.withVerb(expected.verb as HTTPVerbs);
      TestDeed.withBody(expected.body);
      TestDeed.withJSON(expected.json);
      TestDeed.withQueryParams(expected.queryParams);
      TestDeed.thenDoes(expected.action);
      TestDeed.afterwards(expected.after);
      TestDeed.withConfig(expected.config);
      TestDeed.catchError(expected.catchError);
      TestDeed.withHeaders(expected.headers);

      expect(TestDeed.getProperties()).toMatchObject(expected);
    });

    it('setAs() throws error with incorrect argument type', () => {
      const x = {} as RequestDeed;
      expect(() => setAs('test', 'test', x, 'function')).toThrowError();
    });

    it('setAs() throws error with incorrect alternate argument type', () => {
      const x = {} as RequestDeed;
      expect(() => setAs('test', 'test', x, 'function', 'number')).toThrowError();
    });

    it('setAs() accepts valid alternate argument type', () => {
      const x = new RequestDeed('test');
      setAs('test', '_path', x, 'string', 'function');
      expect(typeof x.getProperties().path).toBe('string');

      setAs(() => null, '_path', x, 'string', 'function');
      expect(typeof x.getProperties().path).toBe('function');
    });
  });
});

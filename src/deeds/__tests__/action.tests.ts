import action, { ActionDeed } from '../action';
import { DeedTypes, ActionFunction } from '../../types';

describe('deed.action', () => {
  describe('action', () => {
    it('.called() returns ActionDeed', () => {
      const testDeed = action.called('test');
      expect(testDeed).toBeInstanceOf(ActionDeed);
    });
  });

  describe('ActionDeed', () => {
    it('handles normal flow', () => {
      const TestDeed = new ActionDeed('test');
      const testFn = jest.fn();
      const td = TestDeed.thatDoes(testFn);
      expect(td).toBe(TestDeed);
      expect(TestDeed.deedType).toEqual(DeedTypes.action);
      expect(TestDeed.getProperties()).toMatchObject({
        name: 'test',
        action: testFn,
      });
    });

    it('throws Error when thatDoes is not passed a function', () => {
      const TestDeed = new ActionDeed('test');
      const notFn = 'not a function';
      expect(() => TestDeed.thatDoes((notFn as unknown) as ActionFunction)).toThrowError();
    });
  });
});

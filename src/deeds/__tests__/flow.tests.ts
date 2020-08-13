import flow, { FlowDeed } from '../flow';
import action from '../action';

const ActionDeed = action.called('action').thatDoes(() => ({ test: true }));

describe('deed.flow', () => {
  describe('flow', () => {
    it('.called() returns FlowDeed', () => {
      const testDeed = flow.called('test');
      expect(testDeed).toBeInstanceOf(FlowDeed);
    });
  });

  describe('FlowDeed', () => {
    it('handles normal flow', () => {
      const TestDeed = new FlowDeed('test')
        .thatStartsWith(ActionDeed)
        .whichAdvancesOn('shipment')
        .andThenCalls(ActionDeed)
        .withOriginalArgs()
        .whichMapsTo(res => res);

      expect(TestDeed.getProperties()).toEqual({
        name: 'test',
        triggers: ['shipment', 'done'],
        queue: [ActionDeed, ActionDeed],
        argSources: ['lastCalled', 'original'],
        transforms: [expect.any(Function), expect.any(Function)],
      });
    });
  });
});

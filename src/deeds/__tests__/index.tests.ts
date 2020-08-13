import deed from '../index';
import action from '../action';
import request from '../request';

describe('deed', () => {
  it('exposes both types of deeds', () => {
    expect(deed).toMatchObject({
      action,
      request,
    });
  });
});

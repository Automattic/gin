/* istanbul ignore file */

import Store from '../../store/store';

const noop = () => null;

export const mockStores = process.env.NODE_ENV === 'test' ? Store.mock : noop;
export const unmockStores = process.env.NODE_ENV === 'test' ? Store.unmock : noop;

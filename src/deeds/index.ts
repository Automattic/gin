import action from './action';
import request from './request';
import flow from './flow';
// tslint:disable-next-line: class-name
export interface deed {
  action: action;
  request: request;
  flow: flow;
}
const deed: deed = {
  action,
  request,
  flow,
};

export default deed;
export { default as combineDeeds } from './combineDeeds';

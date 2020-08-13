import { RequestDeed } from '../deeds/request';
import { ActionDeed } from '../deeds/action';
import { FlowDeed } from '../deeds/flow';
import StubDeed from '../test-utils/stub/stubDeed';
import { ProcessEvent } from '../store/process';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export interface DeedMap {
  [key: string]: DeedInvocation;
}
// tslint:disable-next-line: class-name
export type obj<T> = Record<string, T>;

export type Unsubscribe = (id: symbol) => void;
export type Subscribe = (id: symbol, handler: () => any) => void;

export type Deed = ActionDeed | RequestDeed | StubDeed | FlowDeed;

export enum DeedTypes {
  action = 'action',
  request = 'request',
  stub = 'stub',
  flow = 'flow',
}
export type Selector<T = any> = (cargo: T) => Partial<T> & obj<any>;

export type DeedCalls<T extends Record<string, any> = {}> = Partial<
  {
    [key in keyof Omit<T, 'default'>]: (...args: any) => Promise<any>;
  }
>;

export interface FetchExtras {
  props?: obj<any>;
  cargo?: obj<any>;
}

export interface RequestExtras {
  deeds?: DeedMap;
  cargo?: obj<any>;
  props?: obj<any>;
}

export interface ActionExtras {
  cargo?: obj<any>;
  deeds?: DeedMap;
  props?: obj<any>;
  skipShipment?: () => void;
}

export type ArgsType = any | any[];

export type ActionFunction = (actionExtras?: ActionExtras, ...args: ArgsType) => obj<any> | void;
export type RequestFunction<T = any> = (requestExtras?: RequestExtras, ...args: ArgsType) => T;
export type FetchFunction<T = any> = (fetchExtras?: FetchExtras, ...args: ArgsType) => T;

export type DeedInvocation<T = any> = (...args: T[]) => T;

export type ActionMethods = 'thatDoes' | 'thenDoes';

export type FlowMethods = 'whichMapsTo';

export type FetchMethods = 'hits' | 'withQueryParams' | 'withBody' | 'withJSON' | 'withConfig';

export type RequestMethods = 'afterwards' | 'catchError';

export enum PubEvents {
  'NEW_STORE' = 'NEW_STORE',
  'STORE_REMOVED' = 'STORE_REMOVED',

  'ADD_SUB' = 'ADD_SUB',
  'SUB_REMOVED' = 'SUB_REMOVED',

  'CARGO_SHIPPED' = 'CARGO_SHIPPED',
  'DEED_FIRED' = 'DEED_FIRED',
  'SUB_UPDATED' = 'SUB_UPDATED',
  'SUB_SUBSCRIBED' = 'SUB_SUBSCRIBED',
}

export enum Trigger {
  'done' = 'done',
  'shipment' = 'shipment',
}

export interface FlowTriggerToProcessTrigger {
  [Trigger.done]?: ProcessEvent.end;
  [Trigger.shipment]?: ProcessEvent.cleanup;
}

export type FlowedFunction = AsyncGenerator<any, any>;

export enum ArgSource {
  'original' = 'original',
  'lastCalled' = 'lastCalled',
}

export interface ResponseError extends Error {
  status: number;
  statusText: string;
  url: string;
}

export enum BatchMode {
  SHALLOW = 'shallow',
  DEEP = 'deep',
}

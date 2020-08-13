import {
  obj,
  DeedTypes,
  ActionFunction,
  RequestFunction,
  RequestExtras,
  FetchFunction,
  ResponseError,
} from '../types';

// tslint:disable-next-line: class-name
interface request {
  called: RequestDeedFactory;
}

export type HTTPVerbs =
  | 'get'
  | 'head'
  | 'post'
  | 'put'
  | 'delete'
  | 'connect'
  | 'options'
  | 'trace'
  | 'patch'
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

type RequestDeedFactory = (name: string) => RequestDeed;

type PathDeedFunction = (path: string | FetchFunction<string>) => RequestDeed;

type QueryParamsDeedFunction = (paramsFunc: FetchFunction<obj<any>>) => RequestDeed;

type BodyDeedFunction = (bodyFunc: FetchFunction) => RequestDeed;

type JSONDeedFunction = (bodyFunc: FetchFunction<obj<any>>) => RequestDeed;

type VerbDeedFunction = (verb: HTTPVerbs) => RequestDeed;

type AfterDeedFunction = (afterFunc: RequestFunction) => RequestDeed;

type HeadersFunction = (headers: obj<string>) => RequestDeed;

type ConfigDeedFunction = (configFunc: FetchFunction<RequestInit>) => RequestDeed;

type ThenActionDeedFunction = (actionFunc: ActionFunction) => RequestDeed;

type CatchFunction = <e extends ResponseError>(requestExtras: RequestExtras, e: e) => void;
type CatchDeedFunction = (catchFunc: CatchFunction) => RequestDeed;

export interface RequestProperties {
  name: RequestDeed['_name'];
  path: RequestDeed['_path'];
  verb: RequestDeed['_verb'];
  queryParams: RequestDeed['_queryParams'];
  body: RequestDeed['_body'];
  json: RequestDeed['_json'];
  after: RequestDeed['_after'];
  action: RequestDeed['_action'];
  catchError: RequestDeed['_catchError'];
  config: RequestDeed['_config'];
  headers: RequestDeed['_headers'];
}

type GetProperties = () => RequestProperties;
export class RequestDeed {
  public deedType: string = DeedTypes.request;
  private _name: string;
  private _path: FetchFunction<string> | string = '';
  private _verb?: string;
  private _queryParams?: FetchFunction<obj<any>>;
  private _body?: FetchFunction;
  private _json?: FetchFunction<obj<any>>;
  private _after?: RequestFunction;
  private _action?: ActionFunction;
  private _catchError?: CatchFunction;
  private _config?: FetchFunction<RequestInit>;
  private _headers?: obj<string>;

  constructor(name: string) {
    this._name = name;
  }
  public hits: PathDeedFunction = arg => setAs(arg, '_path', this, 'string', 'function');
  public withQueryParams: QueryParamsDeedFunction = arg =>
    setAs(arg, '_queryParams', this, 'function');
  public withBody: BodyDeedFunction = arg => setAs(arg, '_body', this, 'function');
  public withJSON: JSONDeedFunction = arg => setAs(arg, '_json', this, 'function');
  public withVerb: VerbDeedFunction = arg => setAs(arg, '_verb', this, 'string');
  public withHeaders: HeadersFunction = arg => setAs(arg, '_headers', this, 'object');
  public withConfig: ConfigDeedFunction = arg => setAs(arg, '_config', this, 'function');
  public afterwards: AfterDeedFunction = arg => setAs(arg, '_after', this, 'function');
  public thenDoes: ThenActionDeedFunction = arg => setAs(arg, '_action', this, 'function');
  public catchError: CatchDeedFunction = arg => setAs(arg, '_catchError', this, 'function');

  public getProperties: GetProperties = () => {
    return {
      name: this._name,
      path: this._path,
      action: this._action,
      verb: this._verb,
      queryParams: this._queryParams,
      body: this._body,
      json: this._json,
      after: this._after,
      catchError: this._catchError,
      config: this._config,
      headers: this._headers,
    };
  };
}

type SetAsFunc<T> = (value: any, name: string, dest: T, type: string, alternateType?: string) => T;
export const setAs: SetAsFunc<RequestDeed> = (value, name, dest, type, alternateType) => {
  let hasTypeError = false;
  if (typeof value !== type) {
    hasTypeError = true;
  }
  if (alternateType && typeof value === alternateType) {
    hasTypeError = false;
  }
  if (hasTypeError) {
    throw TypeError(
      `Argument ${value} must be of type ${type}${alternateType ? ` or ${alternateType}` : ''}`,
    );
  }
  dest[name] = value;
  return dest;
};

const requestDeedFactory: RequestDeedFactory = name => {
  return new RequestDeed(name);
};

const request: request = {
  called: name => requestDeedFactory(name),
};

export default request;

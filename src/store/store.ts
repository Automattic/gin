// tslint:disable member-ordering

/*
-- gin
* Construction/Registration:
constructor, registerDeeds, registerInstance, Store.assign.to, subscribe, watch
* Initialization
initRequestDeed, initActionDeed, initStubDeed, initFlowDeed, generateAction, makeFetchCall
* Cleanup
unsubscribe, unwatch, disconnect, resetBatch, endProcess
* Cargo Transit
emit, startTimer, enqueue, resetBatch,
* Other
getName, debugLog, updateCurrentProps, Store.publish, updateCargo

-- Deed Flows
* Action Deed Flow
registerDeeds -> initActionDeed -> generateAction -> enqueue? -> startTimer? -> emit?
* Request Deed Flow
registerDeeds -> initRequestDeed -> makeFetchCall -> generateAction? -> enqueue? -> startTimer? -> emit?
* Stub Deed Flow
registerDeeds -> initStubDeed
* Flow Deed Flow
registerDeeds -> initFlowDeed -> (Deed Flows) -> Loop(moveThroughFlow -> attachProcessTrigger -> (Deed Execution))

*/
import shortid from 'shortid';
import { ActionDeed } from '../deeds/action';
import { FlowDeed } from '../deeds/flow';
import Process, { ProcessEvent } from './process';
import { RequestDeed } from '../deeds/request';
import StubDeed from '../test-utils/stub/stubDeed';
import {
  ActionExtras,
  ActionFunction,
  Deed,
  DeedInvocation,
  DeedMap,
  DeedTypes,
  FetchExtras,
  FlowTriggerToProcessTrigger,
  obj,
  PubEvents,
  RequestExtras,
  RequestFunction,
  Subscribe,
  Trigger,
  Unsubscribe,
  ArgSource,
  ResponseError,
  BatchMode,
} from '../types';
import TestStore from '../test-utils/test-store/test-store';
import deepMerge from 'lodash/merge';

type ActionDeedInit = (deed: ActionDeed, pid?: string) => void;
type AttachProcessTrigger = (px: Process, trigger: Trigger) => Promise<any>;
type DebugLog = (message: string, color?: string, ...args: any) => void;
type DoAfterCall = (...args: any[]) => Promise<RequestFunction>;
type EndProcess = (px: Process, args: any) => void;
type Enqueue = (returnedDeedValue: any, pid: string) => void;
interface FetchCallConfig {
  config: RequestInit;
  url: string;
  doAfterCall: (args: any[]) => Promise<RequestFunction>;
  doLast: DeedInvocation;
  handleError: (e: Error) => void;
}
interface FlowedDeedConfig {
  name: string;
  px: Process;
}
type GenerateAction = (
  action: ActionFunction,
  name: string,
  isRequestDeed?: boolean,
  processId?: string,
) => (args: any[] | any) => void;
type MakeFetchCall = (fetchCallConfig: FetchCallConfig) => Promise<any>;
type MoveThroughFlow = (
  queue: FlowedDeedConfig[][],
  trigger: (keyof typeof Trigger)[],
  ...args: any
) => AsyncGenerator;
type NameFunction = (generatedId: string) => string;
type NamedStores = Map<
  string,
  {
    subscribe: Subscribe;
    unsubscribe: Unsubscribe;
    getCargo: () => obj<any>;
    getDeeds: () => DeedMap;
    getPx: () => Store['_processes'];
  }
>;
type InitFlowDeed = (deed: FlowDeed, pid: string) => void;
type InitStubDeed = (deed: StubDeed) => void;
type RegisterDeeds = (deeds: Deed[], pid?: string) => void;
type RequestDeedInit = (deed: RequestDeed, pid?: string) => void;
type ResetBatch = () => void;
interface StoreProps {
  batchTime?: number;
  batchMode?: BatchMode;
  cargo?: obj<any>;
  customFetch?: any;
  debug?: boolean;
  deeds?: Deed[];
  name?: string | NameFunction;
  [key: string]: any;
}

type UpdateCargo = (newCargo: obj<any>) => void;

const BATCH_TIMEOUT = 4; // ms

const convertFromFlowToProcessTrigger: FlowTriggerToProcessTrigger = {
  [Trigger.done]: ProcessEvent.end,
  [Trigger.shipment]: ProcessEvent.cleanup,
};

const isContentTypeJSON = (contentType: string) => {
  if (!contentType) {
    return false;
  }
  return (
    contentType.indexOf('application/javascript') !== -1 ||
    contentType.indexOf('application/json') !== -1
  );
};

const defaultFetchResponse = res => {
  const isJson = isContentTypeJSON(res.headers.get('content-type'));
  if (!res.ok) {
    throw Error(
      JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        url: res.url,
      }),
    );
  }

  if (!isJson) {
    // Whatever body is here, we can't parse it. So just resolve with an empty object.
    return Promise.resolve({
      message: `The API response from ${res.url} returned a body type of something other than JSON.
      If you need to handle non-JSON responses, define your own Store.defaultFetchResponse.`,
    });
  }

  return res.json();
};

const defaultErrorResponse = (e: Error): void => {
  throw e;
};

const mergeByMode = {
  [BatchMode.SHALLOW]: (o1, o2) => Object.assign({}, o1, o2),
  [BatchMode.DEEP]: (o1, o2) => deepMerge({}, o1, o2),
};

class Store {
  /* ******* STATIC ******** */
  // Assign a subscriber to a store
  public static assign = (id, handler) => {
    return {
      to: storeName => {
        if (!Store.namedStores.has(storeName)) {
          throw Error(
            `You're attempting to subscribe to ${storeName}, but that store hasn't been created yet`,
          );
        }
        const store = Store.namedStores.get(storeName);
        store.subscribe(id, handler);
        Store.publish(PubEvents.ADD_SUB, { storeName, subId: id });
        return store;
      },
    };
  };
  public static baseUrl = '';
  public static defaultFetchResponse = defaultFetchResponse;
  public static defaultErrorResponse = defaultErrorResponse;
  public static defaultFetchOptions: ResponseInit = {};

  // Replaces stores with the test store
  public static mock = () => {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      throw Error('Attempting to mock the store is not allowed outside of a test environment');
    }
    Store._assign = Store.assign;
    Store.assign = () => ({ to: () => Store.TestStore as any });
  };

  public static namedStores: NamedStores = new Map();

  public static publish = async (eventName: PubEvents, payload) =>
    Store.watchers.length &&
    Store.watchers.forEach(manager => Promise.resolve(manager(eventName, payload)));

  public static TestStore: TestStore = new TestStore();

  // Replaces the test store with real stores
  public static unmock = () => {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test' || !Store._assign) {
      throw Error('Store has not been mocked!');
    }
    Store.assign = Store._assign;
    Store._assign = undefined;
  };

  public static unwatch = watcher => {
    const i = Store.watchers.indexOf(watcher);
    Store.watchers.splice(i, 1);
  };

  public static watch = watcher => Store.watchers.push(watcher);
  public static watchers = [];

  // @ts-ignore used to hold the old assign while being mocked
  private static _assign: any;

  constructor(props: StoreProps = {}) {
    const {
      cargo = {},
      deeds = [],
      customFetch,
      name,
      debug,
      batchTime,
      batchMode,
      ...restProps
    } = props;

    let storeName = name;
    if (typeof name === 'function') {
      storeName = name(shortid.generate());
    }

    if (!storeName) {
      storeName = shortid.generate();
    }

    // setup attributes
    this._cargo = cargo;
    this._volatileCargo = cargo;
    this._fetch = customFetch ? customFetch : this._fetch;
    this._batchTime = batchTime != null ? batchTime : this._batchTime;
    this._batchMode = batchMode === BatchMode.DEEP ? BatchMode.DEEP : BatchMode.SHALLOW;
    if (this._batchTime === 0) {
      this._isBatchless = true;
    }
    this._isDebugMode = debug === true;

    // setup props
    this.updateCurrentProps(restProps);

    // initialize process for external update
    this.updateCargo = (this.updateCargo({}) as unknown) as UpdateCargo;

    // register store
    if (typeof storeName === 'string' && storeName.length > 0) {
      this._storeName = storeName;
      this._registerInstance();
    } else {
      throw Error('Name must be a non-empty string');
    }

    // register deeds
    this._registerDeeds(deeds);
  }

  private _batch: obj<any> = {};
  private _batchedPids: string[] = [];
  private _batchMode: BatchMode = BatchMode.SHALLOW;
  private _batchTime: number = BATCH_TIMEOUT;
  private _cargo: obj<any>;
  private _currentProps: obj<any> = {};
  private _deeds: DeedMap = {};
  private _fetch: any = fetch.bind(global);
  private _isBatchless: boolean = false;
  private _isDebugMode: boolean = false;
  private _processes: Map<string, Process> = new Map();
  private _timer?: number;
  private _volatileCargo: obj<any> = {};
  private _storeName?: string;
  private _subs: Map<symbol, (...args: any) => any> = new Map();

  /* ******* PUBLIC ******** */

  // Close and cleanup this store
  public disconnect = () => {
    Store.namedStores.delete(this._storeName);
    this._subs.clear();
    this._processes.forEach(px => px && px.emit(ProcessEvent.kill));
    this._processes.clear();
    this._deeds = new Proxy(
      {},
      {
        get: (t, p) => {
          // tslint:disable-next-line: no-console
          console.warn(`Deed "${String(p)}" was called on disconnected store ${this._storeName}`);
          return () => Promise.resolve();
        },
      },
    );
    this._cargo = null;
    Store.publish(PubEvents.STORE_REMOVED, { storeName: this._storeName });
  };

  // expose name
  public getName = () => this._storeName;

  // useSource or withSource call this to get access to cargo and actions
  public subscribe: Subscribe = (id, handler) => {
    this._subs.set(id, handler);
  };

  public updateCargo: UpdateCargo = () => {
    const px = new Process('external update');
    this._processes.set(px.pid, px);
    return newCargo => {
      px.emit(ProcessEvent.start, newCargo);
      const pid = px.pid;
      this._debugLog(`external queued cargo:`, 'DarkSalmon', newCargo);
      this._enqueue(newCargo, pid);
    };
  };

  // useSource and withSource call this when unmounting to unsubscribe from updates
  public unsubscribe: Unsubscribe = (id: symbol) => {
    this._subs.delete(id);
  };

  // Keep our reference to external props updated
  public updateCurrentProps = newProps => {
    this._currentProps = {
      ...this._currentProps,
      ...newProps,
    };
  };

  /* ******* PRIVATE ******** */

  // Handle the given process event and resolve it back to the flow
  // @ts-ignore
  private _attachProcessTrigger: AttachProcessTrigger = (px, trigger) =>
    new Promise((resolve, reject) =>
      px.attach(convertFromFlowToProcessTrigger[trigger], (pxInfo, ...args) => resolve(...args)),
    );

  private _debugLog: DebugLog = (message, color = 'black', ...args) => {
    if (this._isDebugMode) {
      const messageStyle = `
        border-left: 2px solid ${color};
        padding-left: 4px;
        font-size: 1em;
        color: ${color}
      `;

      const additionalArgs = [];
      args.forEach(arg => {
        additionalArgs.push(typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg);
      });
      // tslint:disable-next-line: no-console , necessary for a debug tool
      const debugLog = console.log.bind(
        this,
        ...[
          `%c${this._storeName ? `${this._storeName}:` : ''}${message}`,
          messageStyle,
          ...additionalArgs,
        ],
      );
      debugLog();
    }
  };

  // Called after batch timer expires, ships new cargo to subscribers
  private _emit = () => {
    // Get new cargo, then diff with old cargo
    const newCargo = this._volatileCargo;

    this._debugLog(`new cargo`, 'green', newCargo);

    // Use each subs selector to determine if eligible for update
    this._subs.forEach(listener => listener(newCargo));

    // Set new cargo
    this._cargo = newCargo;
    Store.publish(PubEvents.CARGO_SHIPPED, { cargo: newCargo, storeName: this._storeName });
    this._batchedPids.forEach(pid => this._endProcess(this._processes.get(pid), newCargo));
    this._resetBatch();
  };

  // close and cleanup a process
  private _endProcess: EndProcess = (px, args) => {
    if (px) {
      px.emit(ProcessEvent.cleanup, args);
    }
  };

  /*
   Send updated cargo to subscribers
   waits to emit until batch timer elapses
   Pushes new cargo into batch
   */
  private _enqueue: Enqueue = (returnedDeedValue, pid) => {
    if (!this._timer && !this._isBatchless) {
      this._startTimer();
    }
    this._batch = mergeByMode[this._batchMode](this._batch, returnedDeedValue);
    this._volatileCargo = mergeByMode[this._batchMode](this._volatileCargo, this._batch);

    this._batchedPids.push(pid);
    if (this._isBatchless) {
      this._emit();
    }
  };

  private _generateAction: GenerateAction = (action, name, isRequestDeed, processId = null) => {
    let pid = processId;

    // Start process for action deeds
    if (!isRequestDeed && !processId) {
      const px = new Process(name);
      this._processes.set(px.pid, px);
      pid = px.pid;
    }

    return async (...args) => {
      let shouldSkipCargoUpdate = false;
      let returnedDeedValue = null;

      const actionExtras: () => ActionExtras = () => ({
        props: this._currentProps,
        cargo: this._volatileCargo,
        deeds: this._deeds,
        skipShipment: () => {
          shouldSkipCargoUpdate = true;
        },
      });
      try {
        const thisPx = this._processes.get(pid);
        if (thisPx) {
          thisPx.emit(ProcessEvent.start, args);
          this._debugLog(`${name} does()`, 'Blue');
        }

        // don't emit until we have a real value (await)
        // @ts-ignore ts doesn't like parameters after a spread param
        returnedDeedValue = await action(actionExtras(), ...args);

        // process is now "done"
        if (thisPx) {
          thisPx.emit(ProcessEvent.end, returnedDeedValue);
        }
        if (!shouldSkipCargoUpdate) {
          this._debugLog(`${name} queued cargo:`, 'DarkSalmon', returnedDeedValue);
          this._enqueue(returnedDeedValue, pid);
        } else {
          this._endProcess(thisPx, returnedDeedValue);
        }
        return returnedDeedValue;
      } catch (e) {
        throw Error(`deed ${name} threw an error but didn't handle it.\n${e}`);
      }
    };
  };

  /**
   * Initialize Action deeds
   * Bind the deed function with extra arguments, then take the returned value and make a cargo change from it
   * This bound function is passed down to subscribers
   */
  private _initActionDeed: ActionDeedInit = (deed, pid) => {
    const { name, action } = deed.getProperties();
    if (this._deeds[name]) {
      throw Error(`A deed has already been registered with name ${name}`);
    }

    this._deeds[name] = this._generateAction(action, name, false, pid);
  };

  /**
   * Initialize Flow Deeds
   * Creates a temporary deed proxy of the internal deeds
   * Attaches promises to the given triggers of the processes associated with those deeds
   * yields to all deeds in a stage to resolve before moving to the next
   */

  private _initFlowDeed: InitFlowDeed = (flowDeed, processId) => {
    const { name, triggers, argSources, queue, transforms } = flowDeed.getProperties();

    // The actual deed function
    let pid = processId; // Flows can be nested
    if (!processId) {
      // setup flow parent process
      const flowParentPx = new Process(name);
      this._processes.set(flowParentPx.pid, flowParentPx);
      pid = flowParentPx.pid;
    }

    // Open the flow process
    let thisPx = this._processes.get(pid);

    // Configure and register deeds
    const deedConfigs = queue.map((deedOrDeeds, i) => {
      // create custom deeds by including the parent process
      const deedsArr = Array.isArray(deedOrDeeds) ? deedOrDeeds : [deedOrDeeds];
      return deedsArr.map(deed => {
        if (!deed) {
          throw Error(`flow deed ${name} was passed an invalid deed`);
        }
        const newName = `${name}-${deed.getProperties().name}-stage-${i}`; // come up with a unique name for the deed to avoid conflicts

        // Ensures that the new name is used when this deed is registered
        const deedCopy = new Proxy(deed, {
          get(target, p, rec) {
            const defaultResponse = Reflect.get(target, p, rec);
            if (p === 'getProperties') {
              const modifiedResponse = defaultResponse();
              modifiedResponse.name = newName; // replace the old name with the new one
              return () => modifiedResponse;
            }
            return defaultResponse;
          },
        });

        // Create a process for the child deed, but don't start it
        // @ts-ignore accessing private variable
        const deedPx = new Process(newName); // use the original deed name for easier debugging
        deedPx.parent = thisPx.pid;
        thisPx.children.add(deedPx.pid);

        this._processes.set(deedPx.pid, deedPx);

        this._registerDeeds([deedCopy], deedPx.pid); // register the new deed, passing in the process we have ready for it
        return { name: newName, px: deedPx };
      });
    });

    this._deeds[name] = async (...initArgs) => {
      thisPx = this._processes.get(pid);

      if (thisPx) {
        thisPx.emit(ProcessEvent.start, ...initArgs);
      }

      // init variables that will be modified by the flow
      let args = initArgs;
      let done = false;
      let lastValue = null;

      // Init our generator
      const gen = this._moveThroughFlow(deedConfigs, triggers, ...args);

      // Iterate through the flow, passing in different args depending on the trigger type
      for (let i = 0; i < queue.length && !done; i += 1) {
        const res = await gen.next(argSources[i] === ArgSource.original ? initArgs : args);
        const { value } = res;
        lastValue = value;

        args = await transforms[i](...lastValue);
        args = Array.isArray(args) ? args : [args];

        done = res.done;
      }

      if (thisPx) {
        // done - cleanup
        thisPx.emit(ProcessEvent.end, lastValue);
        this._endProcess(thisPx, args);
      }
    };
  };

  /**
   * Initialize Request deeds
   * Bind the deed function with extra arguments and the fetch api
   * This bound function is passed down to subscribers
   */
  private _initRequestDeed: RequestDeedInit = (deed, processId) => {
    const {
      name,
      path,
      action,
      config,
      catchError,
      after,
      body,
      json,
      headers,
      queryParams,
      verb = 'GET',
    } = deed.getProperties();

    if (this._deeds[name]) {
      throw Error(`A deed has already been registered with name ${name}`);
    }

    let pid = processId;

    // Make a new process if we weren't provisioned one already
    if (!processId) {
      const px = new Process(name);
      this._processes.set(px.pid, px);
      pid = px.pid;
    }

    const queryString = new URLSearchParams();
    let fetchConfig: RequestInit = {
      body: '',
      headers: {
        ...(Store.defaultFetchOptions.headers ? Store.defaultFetchOptions.headers : {}),
      },
      method: verb,
    };
    let doAfterCall: DoAfterCall = async (...args: any) => args;
    let doLast: ActionFunction = (args: any) => {
      const thisPx = this._processes.get(pid);
      if (thisPx) {
        thisPx.emit(ProcessEvent.end, args);
        this._endProcess(thisPx, args);
      }
      return args;
    };
    let handleError = Store.defaultErrorResponse;

    const fetchExtras: () => FetchExtras = () => ({
      props: this._currentProps,
      cargo: this._volatileCargo,
    });

    const requestExtras: () => RequestExtras = () => ({
      props: this._currentProps,
      deeds: this._deeds,
      cargo: this._volatileCargo,
    });
    /* THEN DOES */
    if (action) {
      doLast = this._generateAction(action, name, true, pid);
    }

    // The actual deed call
    this._deeds[name] = async (...args: any[]) => {
      this._debugLog(`request ${name}`, 'Blue');
      const thisPx = this._processes.get(pid);

      if (thisPx) {
        thisPx.emit(ProcessEvent.start, args);
      }

      /* QUERY PARAMS */
      if (queryParams) {
        const qP = queryParams(fetchExtras(), ...args);
        if (typeof qP !== 'object') {
          throw Error(`withQueryParams must return an object`);
        }
        Object.keys(qP).forEach(key => {
          if (qP[key] === undefined) {
            queryString.delete(key);
          } else {
            queryString.set(key, qP[key]);
          }
        });
      }

      /* CONFIG */
      if (config) {
        fetchConfig = {
          ...fetchConfig,
          ...config(fetchExtras(), ...args),
        };
      }

      /* BODY */
      if (body) {
        fetchConfig.body = body(fetchExtras(), ...args);
      }

      /* JSON */
      if (json) {
        fetchConfig.body = JSON.stringify(json(fetchExtras(), ...args));
        fetchConfig.headers['content-type'] = 'application/json; charset=utf-8';
      }

      /* HEADERS */
      if (headers) {
        fetchConfig.headers = {
          ...fetchConfig.headers,
          ...headers,
        };
      }

      /* CATCH ERROR */
      if (catchError) {
        handleError = (e: ResponseError): void => {
          return catchError(requestExtras(), e);
        };
      }

      /* AFTER */
      if (after) {
        doAfterCall = async (...args) => after(requestExtras(), ...args);
      }

      /* HITS */
      const searchParams = queryString.toString();
      let endpointPath = path;
      if (typeof path === 'function') {
        endpointPath = path(fetchExtras(), ...args);
      }
      const url = `${endpointPath}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

      // cleanse headers of null/undefined
      fetchConfig.headers = Object.keys(fetchConfig.headers).reduce((acc, header) => {
        const headerVal = fetchConfig.headers[header];
        if (headerVal != null) {
          acc[header] = headerVal;
        }
        return acc;
      }, {});

      return this._makeFetchCall({
        url,
        doAfterCall,
        doLast,
        handleError,
        config: fetchConfig,
      });
    };
  };

  // Registers a stub deed
  private _initStubDeed: InitStubDeed = stubDeed => {
    const { name, stub } = stubDeed.getProperties();
    this._deeds[name] = stub;
  };

  /**
   * Make the actual fetch api call, using the config generated in _initRequestDeed
   */
  private _makeFetchCall: MakeFetchCall = async function({
    config,
    url,
    doAfterCall,
    doLast,
    handleError,
  }) {
    try {
      if (config.method.toUpperCase() === 'GET' || config.method.toUpperCase() === 'HEAD') {
        delete config.body;
      }
      if (Object.keys(config.headers).length < 1) {
        delete config.headers;
      }
      const res = await this._fetch(`${url.startsWith('http') ? '' : Store.baseUrl}${url}`, {
        ...Store.defaultFetchOptions,
        ...config,
      });
      const data = await Store.defaultFetchResponse(res);
      const afterRes = await doAfterCall(data);

      if (Array.isArray(afterRes)) {
        return doLast(...afterRes);
      }
      return doLast(afterRes);
    } catch (e) {
      return handleError(e);
    }
  };

  // Iterate through flow, yielding once a stack has resolved
  private _moveThroughFlow: MoveThroughFlow = async function*(queue, trigger, ...initArgs) {
    let args = initArgs;
    // tslint:disable prefer-for-of
    for (let i = 0; i < queue.length; i += 1) {
      const stack = queue[i];

      const promises = stack.map(({ name, px }) => {
        const promise = this._attachProcessTrigger(px, trigger[i]);

        // call the deed
        this._deeds[name](...args);
        return promise;
      });
      args = yield await Promise.all(promises);
    }
  };

  /**
   * Takes deeds and sends them to their respective init function
   */
  private _registerDeeds: RegisterDeeds = (deeds, pid) => {
    deeds.forEach((deed: Deed) => {
      switch (deed.deedType) {
        case DeedTypes.action: {
          this._initActionDeed(deed as ActionDeed, pid);
          break;
        }
        case DeedTypes.request: {
          this._initRequestDeed(deed as RequestDeed, pid);
          break;
        }
        case DeedTypes.stub: {
          this._initStubDeed(deed as StubDeed);
          break;
        }
        case DeedTypes.flow: {
          this._initFlowDeed(deed as FlowDeed, pid);
          break;
        }
        default: {
          throw Error('Deed is not a valid Deed type');
        }
      }
    });
  };

  // make this store instance accesible outside of direct subscribers
  private _registerInstance = () => {
    if (Store.namedStores.has(this._storeName)) {
      Store.namedStores.delete(this._storeName);
    }

    Store.namedStores.set(this._storeName, {
      subscribe: this.subscribe,
      unsubscribe: this.unsubscribe,
      getCargo: () => this._cargo,
      getDeeds: () => this._deeds,
      getPx: () => this._processes,
    });

    Store.publish(PubEvents.NEW_STORE, {
      storeName: this._storeName,
      deeds: this._deeds,
      cargo: this._cargo,
    });
  };

  private _resetBatch: ResetBatch = () => {
    clearTimeout(this._timer);
    this._timer = undefined;
    this._batch = {};
    this._batchedPids = [];
  };

  // Set timeout for batching updates
  private _startTimer = () => {
    this._timer = window.setTimeout(this._emit, this._batchTime);
  };
}

export default Store;

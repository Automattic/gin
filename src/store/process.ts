import shortId from 'shortid';

export enum ProcessEvent {
  'start' = 'start',
  'end' = 'end',
  'cleanup' = 'cleanup',
  'kill' = 'kill',
}

export enum ProcessState {
  'ready' = 'ready',
  'running' = 'running',
  'pendingShipment' = 'pendingShipment',
  'killed' = 'killed',
}

type Callback = (...args: any) => void;

type Attach = (eventName: keyof typeof ProcessEvent, cb: Callback) => symbol;
type Detach = (eventName: keyof typeof ProcessEvent, listener: symbol) => void;
type Emit = (eventName: keyof typeof ProcessEvent, ...data: any) => void;

class Process {
  public deedName: string;
  public pid: string = shortId.generate();
  public parent: string = null;
  public children: Set<string> = new Set();
  public runCount: number = 0;
  public state: keyof typeof ProcessState = 'ready';

  private listeners: Map<keyof typeof ProcessEvent, Map<symbol, any>> = new Map([
    [ProcessEvent.start, new Map()],
    [ProcessEvent.end, new Map()],
    [ProcessEvent.cleanup, new Map()],
    [ProcessEvent.kill, new Map()],
  ]);

  constructor(deedName) {
    this.deedName = deedName;
  }

  // attach a listener to an event
  public attach: Attach = (eventName, cb) => {
    const listener = Symbol();
    this.listeners.get(eventName).set(listener, cb);
    return listener;
  };

  // remove a listener from an event
  public detach: Detach = (eventName, listener) => {
    this.listeners.get(eventName).delete(listener);
  };

  // emit data to listeners when an event happens
  public emit: Emit = (eventName, data) => {
    const args = Array.isArray(data) ? data : [data];

    if (eventName === ProcessEvent.start) {
      this.runCount += 1;
      this.state = ProcessState.running;
    }
    if (eventName === ProcessEvent.end) {
      this.state = ProcessState.pendingShipment;
    }
    if (eventName === ProcessEvent.cleanup) {
      this.state = ProcessState.ready;
    }
    if (eventName === ProcessEvent.kill) {
      this.state = ProcessState.killed;
    }

    this.listeners.get(eventName).forEach(listener =>
      listener(
        {
          deedName: this.deedName,
          state: this.state,
          runCount: this.runCount,
          pid: this.pid,
          event: eventName,
          timestamp: performance ? performance.now() : Date(),
        },
        ...args,
      ),
    );

    if (eventName === ProcessEvent.kill) {
      this.listeners.forEach(eventGroup => eventGroup.clear());
    }
  };
}

export default Process;

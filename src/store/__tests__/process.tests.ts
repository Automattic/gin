import Process, { ProcessEvent, ProcessState } from '../process';

describe('Process', () => {
  it('handles basic functions', () => {
    const testFn = jest.fn();

    const px = new Process('test');

    px.attach(ProcessEvent.start, testFn);
    const s = px.attach(ProcessEvent.end, () => null);

    px.emit(ProcessEvent.start, { test: true });

    expect(testFn).toHaveBeenCalledWith(
      {
        deedName: 'test',
        event: ProcessEvent.start,
        pid: expect.any(String),
        timestamp: expect.any(Number),
        runCount: 1,
        state: ProcessState.running,
      },
      { test: true },
    );

    px.detach(ProcessEvent.end, s);
    // tslint:disable-next-line: no-string-literal
    expect(px['listeners'].get(ProcessEvent.end).size).toEqual(0);

    px.emit(ProcessEvent.kill);

    // tslint:disable-next-line: no-string-literal
    expect(px['listeners'].get(ProcessEvent.start).size).toEqual(0);
  });

  it('handles Date instead of performance', () => {
    // @ts-ignore
    const p = global.performance;

    // @ts-ignore
    delete global.performance;
    // @ts-ignore
    global.performance = null;

    const testFn = jest.fn();

    const px = new Process('test');

    px.attach(ProcessEvent.start, testFn);
    const s = px.attach(ProcessEvent.end, () => null);

    px.emit(ProcessEvent.start, { test: true });

    expect(testFn).toHaveBeenCalledWith(
      {
        deedName: 'test',
        event: ProcessEvent.start,
        pid: expect.any(String),
        timestamp: expect.any(String),
        runCount: 1,
        state: ProcessState.running,
      },
      { test: true },
    );

    px.detach(ProcessEvent.end, s);

    // @ts-ignore
    global.performance = p;
  });
});

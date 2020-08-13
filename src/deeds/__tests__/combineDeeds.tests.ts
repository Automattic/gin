import combineDeeds from '../combineDeeds';
import { Deed } from '../../types';

describe('combineTests', () => {
  it('handles individual deed', () => {
    const makeDeedObject: () => Deed = () => (({ getProperties: true } as unknown) as Deed);
    const result = combineDeeds(makeDeedObject());
    expect(result[0]).toMatchObject(makeDeedObject());
  });
  it('handles module of deeds', () => {
    const makeDeedObject: () => Deed = () => (({ getProperties: true } as unknown) as Deed);
    const module = {
      test: makeDeedObject(),
    };
    const result = combineDeeds(module);
    expect(result[0]).toMatchObject(makeDeedObject());
  });
  it('handles array of deeds', () => {
    const makeDeedObject: () => Deed = () => (({ getProperties: true } as unknown) as Deed);
    const arr = [makeDeedObject()];
    const result = combineDeeds(arr);
    expect(result[0]).toMatchObject(makeDeedObject());
  });
  it('handles one of each', () => {
    const makeDeedObject: () => Deed = () => (({ getProperties: true } as unknown) as Deed);
    const arr = [makeDeedObject()];
    const module = { test: makeDeedObject() };
    const result = combineDeeds(arr, module, makeDeedObject());
    expect(result[0]).toMatchObject(makeDeedObject());
    expect(result[1]).toMatchObject(makeDeedObject());
    expect(result[2]).toMatchObject(makeDeedObject());
  });
  it('throws error for any invalid type', () => {
    expect(() => combineDeeds('2')).toThrowError();
  });
});

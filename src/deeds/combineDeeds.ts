import { Deed } from '../types';
type CombineDeeds = (...args: any[]) => Deed[];
// Utility function to aid easy importing of contracts
export const combineDeeds: CombineDeeds = (...args: any[]) =>
  args.reduce((all: Deed[], actionOrModule: Deed | Deed[]) => {
    if (
      (actionOrModule as Deed) === Object(actionOrModule) &&
      (actionOrModule as Deed).getProperties
    ) {
      all.push(actionOrModule as Deed);
    } else if (
      Array.isArray(actionOrModule) ||
      (actionOrModule as Deed) === Object(actionOrModule)
    ) {
      // is module or array
      all.push(...Object.keys(actionOrModule).map(key => actionOrModule[key]));
    } else {
      throw new TypeError(`Can only combine valid deeds, deed arrays, or modules of deeds.
      You passed in a ${typeof actionOrModule}`);
    }

    return all;
  }, []);

export default combineDeeds;

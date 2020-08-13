type CheckEqualOneLevelDeep = (item1: any, item2: any) => boolean;
const checkEqualOneLevelDeep: CheckEqualOneLevelDeep = (item1, item2) => {
  let isEqual = true;
  const initIsEqual = Object.is(item1, item2);

  if (!initIsEqual && typeof item1 === 'object' && typeof item2 === 'object') {
    const item1Keys = Object.keys(item1);
    const item2Keys = Object.keys(item2);
    if (item1Keys.length !== item2Keys.length) {
      isEqual = false;
    } else {
      for (let i = 0; i < item1Keys.length && isEqual; i += 1) {
        isEqual = Object.is(item1[item1Keys[i]], item2[item2Keys[i]]);
      }
    }
  } else {
    isEqual = initIsEqual;
  }
  return isEqual;
};

export default checkEqualOneLevelDeep;

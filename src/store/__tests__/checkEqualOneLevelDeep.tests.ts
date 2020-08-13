import checkEqualOneLevelDeep from '../checkEqualOneLevelDeep';

describe('checkEqualOneLevelDeep', () => {
  describe('should be equal', () => {
    it('handles two numbers', () => {
      expect(checkEqualOneLevelDeep(2, 2)).toEqual(true);
    });

    it('handles two floats', () => {
      expect(checkEqualOneLevelDeep(2.4, 2.4)).toEqual(true);
    });

    it('handles two strings', () => {
      expect(checkEqualOneLevelDeep('test', 'test')).toEqual(true);
    });

    it('handles two empty objects', () => {
      const x = {};
      const y = {};
      expect(checkEqualOneLevelDeep(x, y)).toEqual(true);
    });

    it('handles two advanced objects', () => {
      const x = {};
      const y = {
        x,
        z: 4,
      };
      const w = {
        x,
        z: 4,
      };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(true);
    });

    it('handles two advanced objects 2', () => {
      const x = {};
      const y = { x, z: 5 };
      const w = { ...y };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(true);
    });
  });

  describe('should NOT be equal', () => {
    it('handles two numbers', () => {
      expect(checkEqualOneLevelDeep(2, 3)).toEqual(false);
    });

    it('handles two floats', () => {
      expect(checkEqualOneLevelDeep(2.3, 2.4)).toEqual(false);
    });

    it('handles two strings', () => {
      expect(checkEqualOneLevelDeep('x', 'test')).toEqual(false);
    });

    it('handles two advanced objects', () => {
      const x = {};
      const y = {
        x,
        z: 5,
      };
      const w = {
        x,
        z: 4,
      };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(false);
    });

    it('handles two advanced objects 2', () => {
      const x = {};
      const y = {
        x,
        z: 5,
      };
      const w = {
        x,
      };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(false);
    });

    it('handles two advanced objects 3', () => {
      const x = {};
      const y = {
        x,
        z: 5,
      };
      const w = {
        x: {},
        z: 5,
      };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(false);
    });

    it('handles two advanced objects 4', () => {
      const x = {};
      const y = {
        x,
        z: 5,
      };
      const w = {
        ...y,
        z: 2,
      };
      expect(checkEqualOneLevelDeep(y, w)).toEqual(false);
    });
  });
});

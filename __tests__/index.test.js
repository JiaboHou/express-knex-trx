const yo = require('../src').default;

describe('test test', () => {
  it('returns "hi"', () => {
    expect(yo(true)).toEqual('hi');
  });

  it('return "bye"', () => {
    expect(yo(false)).toEqual('bye');
  });
});

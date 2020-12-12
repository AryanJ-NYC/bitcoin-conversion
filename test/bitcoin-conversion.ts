import { bitcoinTo } from '../src';

describe('blah', () => {
  it('converts bitcoin to satoshis', async () => {
    expect(await bitcoinTo(1, 'satoshis')).toEqual(100000000);
  });
});

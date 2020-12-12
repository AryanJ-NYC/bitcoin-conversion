import { bitcoinToSatoshis, satoshisToBitcoin } from '../src';

describe('bitcoin-conversion', () => {
  it('converts bitcoin to satoshis', () => {
    expect(bitcoinToSatoshis(1)).toEqual(100000000);
    expect(bitcoinToSatoshis(0.5)).toEqual(50000000);
    expect(bitcoinToSatoshis(0.000015)).toEqual(1500);
  });

  it('converts satoshis to bitcoin', () => {
    expect(satoshisToBitcoin(100000000)).toEqual(1);
    expect(satoshisToBitcoin(50000000)).toEqual(0.5);
    expect(satoshisToBitcoin(1500)).toEqual(0.000015);
  });
});

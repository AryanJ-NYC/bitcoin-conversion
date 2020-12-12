import {
  bitcoinToFiat,
  bitcoinToSatoshis,
  fiatToBitcoin,
  satoshisToBitcoin,
} from '../src';

describe('bitcoin-conversion', () => {
  test('converts bitcoin to fiat', async () => {
    expect(typeof (await bitcoinToFiat(1, 'USD'))).toBe('number');
    // TODO: mock CoinDesk endpoint and make sure calculations done correctly
  });

  test('converts bitcoin to satoshis', () => {
    expect(bitcoinToSatoshis(1)).toEqual(100000000);
    expect(bitcoinToSatoshis(0.5)).toEqual(50000000);
    expect(bitcoinToSatoshis(0.000015)).toEqual(1500);
  });

  test('converts satoshis to bitcoin', () => {
    expect(satoshisToBitcoin(100000000)).toEqual(1);
    expect(satoshisToBitcoin(50000000)).toEqual(0.5);
    expect(satoshisToBitcoin(1500)).toEqual(0.000015);
  });

  test('converts fiat to bitcoin', async () => {
    expect(typeof (await fiatToBitcoin(18706.26, 'USD'))).toBe('number');
    // TODO: mock CoinDesk endpoint and make sure calculations done correctly
    // expect(await fiatToBitcoin(18706.26, 'USD')).toBeCloseTo(1);
    // expect(await fiatToBitcoin('18706.26', 'USD')).toBeCloseTo(1);
  });
});

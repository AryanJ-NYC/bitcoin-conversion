import fetchMock from 'fetch-mock-jest';
import {
  bitcoinToFiat,
  bitcoinToSatoshis,
  fiatToBitcoin,
  satoshisToBitcoin,
} from '../src';

describe('bitcoin-conversion', () => {
  beforeAll(() => {
    fetchMock.get('https://api.coindesk.com/v1/bpi/currentprice/usd.json', {
      bpi: { USD: { rate: '17000' } },
    });
  });

  afterAll(() => fetchMock.reset());

  test('converts bitcoin to fiat', async () => {
    expect(await bitcoinToFiat(1, 'USD')).toBe(17000);
    expect(await bitcoinToFiat(2, 'USD')).toBe(34000);
    expect(await bitcoinToFiat(0, 'USD')).toBe(0);
    expect(await bitcoinToFiat(0.423545, 'USD')).toBe(7200.265);
  });

  test('converts bitcoin to satoshis', () => {
    expect(bitcoinToSatoshis(1)).toEqual(100000000);
    expect(bitcoinToSatoshis(0.5)).toEqual(50000000);
    expect(bitcoinToSatoshis(0.000015)).toEqual(1500);
    expect(bitcoinToSatoshis(0.2490521409)).toBe(24905214.09);
    expect(bitcoinToSatoshis(2.4245)).toBe(242450000);
    expect(bitcoinToSatoshis(0)).toBe(0);
  });

  test('converts satoshis to bitcoin', () => {
    expect(satoshisToBitcoin(100000000)).toEqual(1);
    expect(satoshisToBitcoin(50000000)).toEqual(0.5);
    expect(satoshisToBitcoin(1500)).toEqual(0.000015);
    expect(satoshisToBitcoin(24905214.09)).toBe(0.2490521409);
    expect(satoshisToBitcoin(242450000)).toBe(2.4245);
    expect(satoshisToBitcoin(0)).toBe(0);
  });

  test('converts fiat to bitcoin', async () => {
    expect(await fiatToBitcoin(0, 'USD')).toBe(0);
    expect(await fiatToBitcoin(25, 'USD')).toBeCloseTo(0.00147059);
    expect(await fiatToBitcoin(17000, 'USD')).toBe(1);
  });
});

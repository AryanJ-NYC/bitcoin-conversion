import {
  bitcoinToFiat,
  bitcoinToPepecash,
  bitcoinToSatoshis,
  bitcoinToXcp,
  fiatToBitcoin,
  fiatToSatoshis,
  pepecashToBitcoin,
  satoshisToBitcoin,
  satoshisToFiat,
  xcpToBitcoin,
} from '../src';

// Mock fetch globally
global.fetch = jest.fn((url: string) => {
  return Promise.resolve({
    status: 200,
    json: () => {
      if (url === 'https://api.coindesk.com/v1/bpi/currentprice/usd.json') {
        return Promise.resolve({ bpi: { USD: { rate: '17000' } } });
      }
      if (url === 'https://api.coinbase.com/v2/prices/BTC-USD/spot') {
        return Promise.resolve({ data: { amount: '17000', base: 'BTC', currency: 'USD' } });
      }
      if (url === 'https://xchain.io/api/asset/PEPECASH') {
        return Promise.resolve({
          asset: 'PEPECASH',
          estimated_value: { btc: '0.00000045', usd: '0.02', xcp: '0.00197600' },
        });
      }
      if (url === 'https://xchain.io/api/asset/XCP') {
        return Promise.resolve({
          asset: 'XCP',
          estimated_value: { btc: '0.00022868', usd: '9.61', xcp: '1.00000000' },
        });
      }
      return Promise.resolve('');
    },
  });
}) as jest.Mock;

describe('bitcoin-conversion', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses Coinbase API as primary source', async () => {
    const result = await bitcoinToFiat(1, 'USD');
    expect(result).toBe(17_000);
    expect(fetch).toHaveBeenCalledWith('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    expect(fetch).not.toHaveBeenCalledWith('https://api.coindesk.com/v1/bpi/currentprice/usd.json');
  });

  test('falls back to Coindesk API when Coinbase fails', async () => {
    // Mock Coinbase failure first
    (fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 500,
        json: () => Promise.resolve({ error: 'Service unavailable' }),
      })
    );

    const result = await bitcoinToFiat(1, 'USD');
    expect(result).toBe(17000);
    expect(fetch).toHaveBeenCalledWith('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    expect(fetch).toHaveBeenCalledWith('https://api.coindesk.com/v1/bpi/currentprice/usd.json');
  });

  test('converts bitcoin to fiat', async () => {
    expect(await bitcoinToFiat(1, 'USD')).toBe(17000);
    expect(await bitcoinToFiat(2, 'USD')).toBe(34000);
    expect(await bitcoinToFiat(0, 'USD')).toBe(0);
    expect(await bitcoinToFiat(0.423545, 'USD')).toBe(7200.265);
  });

  test('converts bitcoin to PEPECASH', async () => {
    expect(await bitcoinToPepecash(0)).toBe(0);
    expect(await bitcoinToPepecash(0.01)).toBeCloseTo(22_222.2222222222);
  });

  test('converts bitcoin to satoshis', () => {
    expect(bitcoinToSatoshis(1)).toEqual(100000000);
    expect(bitcoinToSatoshis(0.5)).toEqual(50000000);
    expect(bitcoinToSatoshis(0.000015)).toEqual(1500);
    expect(bitcoinToSatoshis(0.2490521409)).toBe(24905214.09);
    expect(bitcoinToSatoshis(2.4245)).toBe(242450000);
    expect(bitcoinToSatoshis(0)).toBe(0);
  });

  test('converts bitcoin to XCP', async () => {
    expect(await bitcoinToXcp(1)).toBeCloseTo(1 / 0.00022868);
    expect(await bitcoinToXcp(34234)).toBeCloseTo(34234 / 0.00022868);
  });

  test('converts satoshis to bitcoin', () => {
    expect(satoshisToBitcoin(100000000)).toEqual(1);
    expect(satoshisToBitcoin(50000000)).toEqual(0.5);
    expect(satoshisToBitcoin(1500)).toEqual(0.000015);
    expect(satoshisToBitcoin(24905214.09)).toBe(0.2490521409);
    expect(satoshisToBitcoin(242450000)).toBe(2.4245);
    expect(satoshisToBitcoin(0)).toBe(0);
  });

  test('converts satoshis to fiat', async () => {
    expect(await satoshisToFiat(100000000, 'USD')).toEqual(17000);
    expect(await satoshisToFiat(50000000, 'USD')).toEqual(8500);
    expect(await satoshisToFiat(1500, 'USD')).toEqual(0.255);
    expect(await satoshisToFiat(24905214, 'USD')).toBe(4233.88638);
    expect(await satoshisToFiat(242450000, 'USD')).toBe(41216.5);
    expect(await satoshisToFiat(0, 'USD')).toBe(0);
  });

  test('converts fiat to bitcoin', async () => {
    expect(await fiatToBitcoin(0, 'USD')).toBe(0);
    expect(await fiatToBitcoin(25, 'USD')).toBeCloseTo(0.00147059);
    expect(await fiatToBitcoin(17000, 'USD')).toBe(1);
  });

  test('converts fiat to satoshis', async () => {
    expect(await fiatToSatoshis(17000, 'USD')).toBe(100000000);
    expect(await fiatToSatoshis(8500, 'USD')).toBe(50000000);
    expect(await fiatToSatoshis(0.255, 'USD')).toBe(1500);
    expect(await fiatToSatoshis(4233.88638, 'USD')).toBe(24905214);
    expect(await fiatToSatoshis(41216.5, 'USD')).toBe(242450000);
    expect(await fiatToSatoshis(0, 'USD')).toBe(0);
  });

  test('converts PEPECASH to bitcoin', async () => {
    expect(await pepecashToBitcoin(0)).toBe(0);
    expect(await pepecashToBitcoin(1)).toBeCloseTo(0.00000045);
    expect(await pepecashToBitcoin(100_000_000)).toBeCloseTo(0.00000045 * 100_000_000);
    expect(await pepecashToBitcoin(54234)).toBeCloseTo(0.00000045 * 54234);
  });

  test('converts XCP to bitcoin', async () => {
    expect(await xcpToBitcoin(0)).toBe(0);
    expect(await xcpToBitcoin(1)).toBeCloseTo(0.00022868);
    expect(await xcpToBitcoin(100_000_000)).toBeCloseTo(0.00022868 * 100_000_000);
    expect(await xcpToBitcoin(54234)).toBeCloseTo(0.00022868 * 54234);
  });
});

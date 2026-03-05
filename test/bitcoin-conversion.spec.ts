import {
  bitcoinToFiat,
  bitcoinToPepecash,
  bitcoinToSatoshis,
  bitcoinToXcp,
  fiatToBitcoin,
  fiatToSatoshis,
  getFiatBtcRate,
  pepecashToBitcoin,
  satoshisToBitcoin,
  satoshisToFiat,
  xcpToBitcoin,
} from '../src';

type MockResponseConfig = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

const COINBASE_URL = (currency: string) =>
  `https://api.coinbase.com/v2/prices/BTC-${currency}/spot`;
const BITPAY_URL = (currency: string) => `https://bitpay.com/rates/BTC/${currency}`;
const BLOCKCHAIN_URL = 'https://blockchain.info/ticker';
const COINGECKO_URL = (currency: string) =>
  `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency.toLowerCase()}`;
const PEPECASH_URL = 'https://xchain.io/api/asset/PEPECASH';
const XCP_URL = 'https://xchain.io/api/asset/XCP';

const DEFAULT_FIAT_RATES: Record<string, string> = {
  USD: '17000',
  EUR: '16000',
  CAD: '23000',
  JPY: '2500000',
  GBP: '15000',
  AUD: '18000',
  NOK: '19000',
  SEK: '20000',
  DKK: '21000',
  CZK: '22000',
};

const createMockResponse = ({
  status,
  body,
  headers = {},
}: MockResponseConfig): {
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
} => ({
  status,
  headers: {
    get: (name: string) => {
      const key = name.toLowerCase();
      return headers[key] ?? headers[name] ?? null;
    },
  },
  json: () => Promise.resolve(body),
});

const defaultFetchResolver = (url: string): MockResponseConfig => {
  const coinbaseMatch = url.match(/https:\/\/api\.coinbase\.com\/v2\/prices\/BTC-([A-Z]{3})\/spot/);
  if (coinbaseMatch) {
    const currency = coinbaseMatch[1];
    const amount = DEFAULT_FIAT_RATES[currency];
    if (!amount) {
      return {
        status: 404,
        body: { errors: [{ id: 'not_found', message: 'Unsupported currency' }] },
      };
    }
    return { status: 200, body: { data: { amount, base: 'BTC', currency } } };
  }

  const bitpayMatch = url.match(/https:\/\/bitpay\.com\/rates\/BTC\/([A-Z]{3})/);
  if (bitpayMatch) {
    const currency = bitpayMatch[1];
    const rate = DEFAULT_FIAT_RATES[currency];
    if (!rate) {
      return { status: 404, body: { error: 'Unknown currency' } };
    }
    return { status: 200, body: { data: { code: currency, name: currency, rate: Number(rate) } } };
  }

  if (url === BLOCKCHAIN_URL) {
    return {
      status: 200,
      body: {
        USD: { last: 17000 },
        EUR: { last: 16000 },
        CAD: { last: 23000 },
        GBP: { last: 15000 },
        AUD: { last: 18000 },
        NOK: { last: 19000 },
        SEK: { last: 20000 },
        DKK: { last: 21000 },
        CZK: { last: 22000 },
      },
    };
  }

  const coinGeckoMatch = url.match(
    /https:\/\/api\.coingecko\.com\/api\/v3\/simple\/price\?ids=bitcoin&vs_currencies=([a-z,]+)/
  );
  if (coinGeckoMatch) {
    const codes = coinGeckoMatch[1].split(',');
    const bitcoin: Record<string, number> = {};

    for (const code of codes) {
      const upperCode = code.toUpperCase();
      const rate = DEFAULT_FIAT_RATES[upperCode];
      if (rate) {
        bitcoin[code] = Number(rate);
      }
    }

    return { status: 200, body: { bitcoin } };
  }

  if (url === PEPECASH_URL) {
    return {
      status: 200,
      body: {
        asset: 'PEPECASH',
        estimated_value: { btc: '0.00000045', usd: '0.02', xcp: '0.00197600' },
      },
    };
  }

  if (url === XCP_URL) {
    return {
      status: 200,
      body: {
        asset: 'XCP',
        estimated_value: { btc: '0.00022868', usd: '9.61', xcp: '1.00000000' },
      },
    };
  }

  return {
    status: 500,
    body: { error: `Unhandled URL in test mock: ${url}` },
  };
};

const configureFetch = (resolver: (url: string) => MockResponseConfig = defaultFetchResolver) => {
  (fetch as jest.Mock).mockImplementation((url: string) => Promise.resolve(createMockResponse(resolver(url))));
};

const wasFetchCalledForUrl = (url: string): boolean => {
  return (fetch as jest.Mock).mock.calls.some(([calledUrl]) => calledUrl === url);
};

// Mock fetch globally
(global as unknown as { fetch: jest.Mock }).fetch = jest.fn() as jest.Mock;

describe('bitcoin-conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureFetch();
  });

  test('uses Coinbase API as primary source', async () => {
    const result = await bitcoinToFiat(1, 'USD');
    expect(result).toBe(17_000);
    expect(wasFetchCalledForUrl(COINBASE_URL('USD'))).toBe(true);
    expect(wasFetchCalledForUrl(BITPAY_URL('USD'))).toBe(false);
  });

  test('falls back to BitPay API when Coinbase fails', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('EUR')) {
        return {
          status: 500,
          body: { error: 'Coinbase unavailable' },
        };
      }
      if (url === BITPAY_URL('EUR')) {
        return {
          status: 200,
          body: { data: { code: 'EUR', name: 'Euro', rate: 16000 } },
        };
      }
      return defaultFetchResolver(url);
    });

    const result = await bitcoinToFiat(1, 'EUR');
    expect(result).toBe(16_000);
    expect(wasFetchCalledForUrl(COINBASE_URL('EUR'))).toBe(true);
    expect(wasFetchCalledForUrl(BITPAY_URL('EUR'))).toBe(true);
  });

  test('falls back to Blockchain API when Coinbase and BitPay fail', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('CAD')) {
        return { status: 503, body: { error: 'Service unavailable' } };
      }
      if (url === BITPAY_URL('CAD')) {
        return { status: 503, body: { error: 'Service unavailable' } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 200, body: { CAD: { last: 23000 } } };
      }
      return defaultFetchResolver(url);
    });

    const result = await bitcoinToFiat(1, 'CAD');
    expect(result).toBe(23_000);
    expect(wasFetchCalledForUrl(COINBASE_URL('CAD'))).toBe(true);
    expect(wasFetchCalledForUrl(BITPAY_URL('CAD'))).toBe(true);
    expect(wasFetchCalledForUrl(BLOCKCHAIN_URL)).toBe(true);
  });

  test('falls back to CoinGecko when Coinbase, BitPay and Blockchain fail', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('JPY')) {
        return { status: 500, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('JPY')) {
        return { status: 500, body: { error: 'BitPay unavailable' } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 200, body: { USD: { last: 17000 } } };
      }
      if (url === COINGECKO_URL('JPY')) {
        return { status: 200, body: { bitcoin: { jpy: 2500000 } } };
      }
      return defaultFetchResolver(url);
    });

    const result = await bitcoinToFiat(1, 'JPY');
    expect(result).toBe(2_500_000);
    expect(wasFetchCalledForUrl(COINBASE_URL('JPY'))).toBe(true);
    expect(wasFetchCalledForUrl(BITPAY_URL('JPY'))).toBe(true);
    expect(wasFetchCalledForUrl(BLOCKCHAIN_URL)).toBe(true);
    expect(wasFetchCalledForUrl(COINGECKO_URL('JPY'))).toBe(true);
  });

  test('returns stale cached rate when all providers fail', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('AUD')) {
        return {
          status: 200,
          body: { data: { amount: '18000', base: 'BTC', currency: 'AUD' } },
        };
      }
      return defaultFetchResolver(url);
    });

    expect(await bitcoinToFiat(1, 'AUD')).toBe(18000);

    configureFetch((url) => {
      if (url === COINBASE_URL('AUD')) {
        return { status: 503, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('AUD')) {
        return { status: 503, body: { error: 'BitPay unavailable' } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 503, body: { error: 'Blockchain unavailable' } };
      }
      if (url === COINGECKO_URL('AUD')) {
        return { status: 503, body: { error: 'CoinGecko unavailable' } };
      }
      return defaultFetchResolver(url);
    });

    expect(await bitcoinToFiat(2, 'AUD')).toBe(36000);
  });

  test('throws aggregated error when all providers fail and no cache exists', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('BYR')) {
        return { status: 503, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('BYR')) {
        return { status: 503, body: { error: 'BitPay unavailable' } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 503, body: { error: 'Blockchain unavailable' } };
      }
      if (url === COINGECKO_URL('BYR')) {
        return { status: 503, body: { error: 'CoinGecko unavailable' } };
      }
      return defaultFetchResolver(url);
    });

    await expect(getFiatBtcRate('BYR')).rejects.toThrow(
      'Failed to fetch BTC-BYR rate from all providers'
    );
  });

  test('429 response applies provider cooldown and uses the next provider', async () => {
    let coinbaseCalls = 0;

    configureFetch((url) => {
      if (url === COINBASE_URL('GBP')) {
        coinbaseCalls += 1;
        return {
          status: coinbaseCalls === 1 ? 429 : 200,
          body:
            coinbaseCalls === 1
              ? { error: 'rate limited' }
              : { data: { amount: '15000', base: 'BTC', currency: 'GBP' } },
          headers: coinbaseCalls === 1 ? { 'retry-after': '120' } : undefined,
        };
      }
      if (url === BITPAY_URL('GBP')) {
        return { status: 200, body: { data: { code: 'GBP', name: 'Pound', rate: 15000 } } };
      }
      return defaultFetchResolver(url);
    });

    expect(await getFiatBtcRate('GBP')).toBe('15000');
    expect(await getFiatBtcRate('GBP')).toBe('15000');

    expect(coinbaseCalls).toBe(1);
    expect(wasFetchCalledForUrl(BITPAY_URL('GBP'))).toBe(true);
  });

  test('returns canonical precision string without forcing 2 decimals', async () => {
    expect(await getFiatBtcRate('NOK')).toBe('19000');
  });

  test('normalizes comma-separated rate strings', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('SEK')) {
        return { status: 503, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('SEK')) {
        return {
          status: 200,
          body: { data: { code: 'SEK', name: 'Swedish Krona', rate: '15,000.129' } },
        };
      }
      return defaultFetchResolver(url);
    });

    expect(await getFiatBtcRate('SEK')).toBe('15000.129');
    expect(await bitcoinToFiat(1, 'SEK')).toBe(15000.129);
  });

  test('preserves precision for non-rounded provider rates', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('DKK')) {
        return { status: 503, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('DKK')) {
        return {
          status: 200,
          body: { data: { code: 'DKK', name: 'Danish Krone', rate: '1.005' } },
        };
      }
      return defaultFetchResolver(url);
    });

    expect(await getFiatBtcRate('DKK')).toBe('1.005');
  });

  test('throws when providers return invalid non-numeric rates', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('CZK')) {
        return { status: 200, body: { data: { amount: 'not-a-number', base: 'BTC', currency: 'CZK' } } };
      }
      if (url === BITPAY_URL('CZK')) {
        return { status: 200, body: { data: { code: 'CZK', name: 'Czech Koruna', rate: 'invalid' } } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 200, body: { CZK: { last: '' } } };
      }
      if (url === COINGECKO_URL('CZK')) {
        return { status: 200, body: { bitcoin: { czk: 'invalid' } } };
      }
      return defaultFetchResolver(url);
    });

    await expect(getFiatBtcRate('CZK')).rejects.toThrow('Failed to fetch BTC-CZK rate from all providers');
  });

  test('rejects blank and non-numeric conversion inputs', async () => {
    expect(() => bitcoinToSatoshis('')).toThrow('invalid numeric input');
    expect(() => satoshisToBitcoin('   ')).toThrow('invalid numeric input');
    await expect(bitcoinToFiat('not-a-number', 'USD')).rejects.toThrow('invalid numeric input');
    await expect(fiatToBitcoin('  ', 'USD')).rejects.toThrow('invalid numeric input');
  });

  test('throws on divide-by-zero fiat rate', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('USD')) {
        return { status: 200, body: { data: { amount: '0', base: 'BTC', currency: 'USD' } } };
      }
      if (url === BITPAY_URL('USD')) {
        return { status: 200, body: { data: { code: 'USD', name: 'US Dollar', rate: 0 } } };
      }
      return defaultFetchResolver(url);
    });

    await expect(fiatToBitcoin(1, 'USD')).rejects.toThrow('division by zero');
  });

  test('throws on divide-by-zero xcp rate', async () => {
    configureFetch((url) => {
      if (url === XCP_URL) {
        return {
          status: 200,
          body: {
            asset: 'XCP',
            estimated_value: { btc: '0', usd: '0', xcp: '1.00000000' },
          },
        };
      }
      return defaultFetchResolver(url);
    });

    await expect(bitcoinToXcp(1)).rejects.toThrow('division by zero');
  });

  test('throws on divide-by-zero pepecash rate', async () => {
    configureFetch((url) => {
      if (url === PEPECASH_URL) {
        return {
          status: 200,
          body: {
            asset: 'PEPECASH',
            estimated_value: { btc: '0', usd: '0', xcp: '0' },
          },
        };
      }
      return defaultFetchResolver(url);
    });

    await expect(bitcoinToPepecash(1)).rejects.toThrow('division by zero');
  });

  test('unsupported subset-provider currency does not stop later providers', async () => {
    configureFetch((url) => {
      if (url === COINBASE_URL('USD')) {
        return { status: 503, body: { error: 'Coinbase unavailable' } };
      }
      if (url === BITPAY_URL('USD')) {
        return { status: 404, body: { error: 'unsupported currency' } };
      }
      if (url === BLOCKCHAIN_URL) {
        return { status: 200, body: {} };
      }
      if (url === COINGECKO_URL('USD')) {
        return { status: 200, body: { bitcoin: { usd: 17000 } } };
      }
      return defaultFetchResolver(url);
    });

    const result = await bitcoinToFiat(1, 'USD');
    expect(result).toBe(17000);
    expect(wasFetchCalledForUrl(COINGECKO_URL('USD'))).toBe(true);
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

const numSatsInBtc = 100_000_000;

export const bitcoinToFiat = async (
  amountInBtc: number | string,
  convertTo: SupportedCurrencies
) => {
  const btc = parseFiniteNumber(amountInBtc, 'amountInBtc');
  const rate = parseFiniteNumber(await getFiatBtcRate(convertTo), `BTC-${convertTo} rate`);
  return btc * rate;
};

export const bitcoinToPepecash = async (amountInBtc: number | string) => {
  const btc = parseFiniteNumber(amountInBtc, 'amountInBtc');
  const pepecashToBtcRate = parseFiniteNumber(await getPepecashBtcRate(), 'PEPECASH/BTC rate');
  return safeDivide(btc, pepecashToBtcRate, 'bitcoinToPepecash');
};

export const bitcoinToSatoshis = (amountInBtc: number | string) => {
  const btc = parseFiniteNumber(amountInBtc, 'amountInBtc');
  return btc * numSatsInBtc;
};

export const bitcoinToXcp = async (amountInBtc: number | string) => {
  const btc = parseFiniteNumber(amountInBtc, 'amountInBtc');
  const xcpToBtcRate = parseFiniteNumber(await getXcpBtcRate(), 'XCP/BTC rate');
  return safeDivide(btc, xcpToBtcRate, 'bitcoinToXcp');
};

export const cryptoToBitcoin = async (
  amountInCrypto: number | string,
  cryptoCode: SupportedCypto
) => {
  const amount = parseFiniteNumber(amountInCrypto, 'amountInCrypto');
  const btcRate = parseFiniteNumber(await getCryptoBtcRate(cryptoCode), `${cryptoCode}/BTC rate`);
  return amount * btcRate;
};

export const pepecashToBitcoin = async (amountInPepecash: number | string) => {
  const pepecash = parseFiniteNumber(amountInPepecash, 'amountInPepecash');
  const pepecashToBtcRate = parseFiniteNumber(await getPepecashBtcRate(), 'PEPECASH/BTC rate');
  return pepecash * pepecashToBtcRate;
};

export const xcpToBitcoin = async (amountInXcp: number | string) => {
  const xcp = parseFiniteNumber(amountInXcp, 'amountInXcp');
  const xcpToBtcRate = parseFiniteNumber(await getXcpBtcRate(), 'XCP/BTC rate');
  return xcp * xcpToBtcRate;
};

export const satoshisToBitcoin = (amountInSatoshis: number | string) => {
  const sats = parseFiniteNumber(amountInSatoshis, 'amountInSatoshis');
  return safeDivide(sats, numSatsInBtc, 'satoshisToBitcoin');
};

export const satoshisToFiat = async (
  amountInSats: number | string,
  convertTo: SupportedCurrencies
) => {
  const btc = satoshisToBitcoin(amountInSats);
  const fiat = await bitcoinToFiat(btc, convertTo);
  return fiat;
};

export const fiatToBitcoin = async (
  amountInCurrency: number | string,
  convertFrom: SupportedCurrencies
) => {
  const amount = parseFiniteNumber(amountInCurrency, 'amountInCurrency');
  const rate = parseFiniteNumber(await getFiatBtcRate(convertFrom), `BTC-${convertFrom} rate`);
  return safeDivide(amount, rate, 'fiatToBitcoin');
};

export const fiatToSatoshis = async (
  amountInCurrency: number | string,
  convertFrom: SupportedCurrencies
) => {
  const amountInBtc = await fiatToBitcoin(amountInCurrency, convertFrom);
  return bitcoinToSatoshis(amountInBtc);
};

export const getCryptoBtcRate = async (cryptoCode: SupportedCypto) => {
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/price?fsym=${cryptoCode}&tsyms=BTC`
  );
  if (response.status !== 200) {
    const json = await response.json();
    throw Error(json);
  }
  const data = await response.json();
  return data.BTC;
};

/**
 * returns the current value of one PEPECASH in BTC
 */
export const getPepecashBtcRate = async () => {
  const response = await fetch('https://xchain.io/api/asset/PEPECASH');
  if (response.status !== 200) {
    const json = await response.json();
    throw Error(json);
  }
  const data = await response.json();
  return data.estimated_value.btc;
};

/**
 * returns the current value of one XCP in BTC
 */
export const getXcpBtcRate = async (): Promise<string> => {
  const response = await fetch('https://xchain.io/api/asset/XCP');
  if (response.status !== 200) {
    const json = await response.json();
    throw Error(json);
  }
  const data = await response.json();
  return data.estimated_value.btc;
};

interface RateCache {
  rate: string;
  timestamp: number;
}

type FiatRateProviderName = 'coinbase' | 'bitpay' | 'blockchain' | 'coingecko';

interface ProviderFailure {
  provider: FiatRateProviderName;
  reason: string;
}

interface ProviderError extends Error {
  cooldownMs?: number;
}

interface FiatRateProvider {
  name: FiatRateProviderName;
  getRate: (currency: SupportedCurrencies) => Promise<string | number>;
}

const rateCache: Record<SupportedCurrencies, RateCache | undefined> = {} as Record<
  SupportedCurrencies,
  RateCache | undefined
>;
const providerCooldowns: Partial<Record<FiatRateProviderName, number>> = {};

const CACHE_TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 60000;
const STALE_CACHE_TTL_MS = 10 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 3000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

export const getFiatBtcRate = async (currency: SupportedCurrencies): Promise<string> => {
  const now = Date.now();
  const cachedData = rateCache[currency];

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return cachedData.rate;
  }

  const failures: ProviderFailure[] = [];

  for (const provider of fiatRateProviders) {
    const cooldownUntil = providerCooldowns[provider.name];

    if (cooldownUntil && cooldownUntil > Date.now()) {
      failures.push({
        provider: provider.name,
        reason: `cooldown until ${new Date(cooldownUntil).toISOString()}`,
      });
      continue;
    }

    try {
      const rawRate = await provider.getRate(currency);
      const rate = normalizeRate(rawRate);
      rateCache[currency] = { rate, timestamp: Date.now() };
      return rate;
    } catch (error) {
      const providerError = toProviderError(error, provider.name);
      failures.push({ provider: provider.name, reason: providerError.message });
      if (providerError.cooldownMs) {
        providerCooldowns[provider.name] = Date.now() + providerError.cooldownMs;
      }
    }
  }

  if (cachedData && Date.now() - cachedData.timestamp <= STALE_CACHE_TTL_MS) {
    return cachedData.rate;
  }

  throw new Error(`Failed to fetch BTC-${currency} rate from all providers. ${describeFailures(failures)}`);
};

const getCoinbaseFiatBtcRate = async (currency: SupportedCurrencies): Promise<string | number> => {
  const { response, data } = await fetchJsonWithTimeout(
    `https://api.coinbase.com/v2/prices/BTC-${currency}/spot`
  );

  ensureHttpSuccess('coinbase', response.status, response.headers.get('retry-after'), data);

  const amount = getNestedValue('coinbase', data, ['data', 'amount']);
  return asRateValue('coinbase', amount, currency);
};

const getBitpayFiatBtcRate = async (currency: SupportedCurrencies): Promise<string | number> => {
  const { response, data } = await fetchJsonWithTimeout(`https://bitpay.com/rates/BTC/${currency}`);

  ensureHttpSuccess('bitpay', response.status, response.headers.get('retry-after'), data);

  const rate = getNestedValue('bitpay', data, ['data', 'rate']);
  return asRateValue('bitpay', rate, currency);
};

const getBlockchainFiatBtcRate = async (currency: SupportedCurrencies): Promise<string | number> => {
  const { response, data } = await fetchJsonWithTimeout('https://blockchain.info/ticker');

  ensureHttpSuccess('blockchain', response.status, response.headers.get('retry-after'), data);

  const currencyData = getNestedValue('blockchain', data, [currency]);
  const rate = getNestedValue('blockchain', currencyData, ['last']);
  return asRateValue('blockchain', rate, currency);
};

const getCoingeckoFiatBtcRate = async (currency: SupportedCurrencies): Promise<string | number> => {
  const lowerCurrency = currency.toLowerCase();
  const { response, data } = await fetchJsonWithTimeout(
    `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${lowerCurrency}`
  );

  ensureHttpSuccess('coingecko', response.status, response.headers.get('retry-after'), data);

  const bitcoin = getNestedValue('coingecko', data, ['bitcoin']);
  const rate = getNestedValue('coingecko', bitcoin, [lowerCurrency]);
  return asRateValue('coingecko', rate, currency);
};

const fetchJsonWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await safeJson(response);
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
};

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const ensureHttpSuccess = (
  provider: FiatRateProviderName,
  status: number,
  retryAfterHeader: string | null,
  data: unknown
) => {
  if (status === 200) {
    return;
  }

  const summary = data === null ? 'no response body' : stringifyJson(data);
  const cooldownMs =
    status === 429
      ? parseRetryAfterMs(retryAfterHeader) ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS
      : undefined;
  throw buildProviderError(provider, `HTTP ${status}: ${summary}`, cooldownMs);
};

const getNestedValue = (
  provider: FiatRateProviderName,
  value: unknown,
  path: string[]
): unknown => {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      throw buildProviderError(provider, `missing field "${path.join('.')}"`);
    }
    current = current[key];
  }

  return current;
};

const asRateValue = (
  provider: FiatRateProviderName,
  value: unknown,
  currency: SupportedCurrencies
): string | number => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  throw buildProviderError(provider, `invalid rate type for ${currency}`);
};

const normalizeRate = (rate: string | number): string => {
  const parsedRate = parseFiniteNumber(rate, 'provider rate', { allowCommas: true });
  return String(parsedRate);
};

const parseFiniteNumber = (
  value: number | string,
  context: string,
  options: { allowCommas?: boolean } = {}
): number => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`invalid numeric input for ${context}: ${value}`);
    }
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`invalid numeric input for ${context}: empty string`);
  }

  const normalized = options.allowCommas ? trimmed.replace(/,/g, '') : trimmed;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid numeric input for ${context}: ${value}`);
  }

  return parsed;
};

const safeDivide = (numerator: number, denominator: number, context: string): number => {
  if (!Number.isFinite(denominator) || denominator === 0) {
    throw new Error(`division by zero for ${context}`);
  }

  return numerator / denominator;
};

const parseRetryAfterMs = (retryAfterHeader: string | null): number | undefined => {
  if (!retryAfterHeader) {
    return undefined;
  }

  const seconds = Number(retryAfterHeader);
  if (!Number.isNaN(seconds) && Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const dateInMs = Date.parse(retryAfterHeader);
  if (Number.isNaN(dateInMs)) {
    return undefined;
  }

  const diff = dateInMs - Date.now();
  return diff > 0 ? diff : undefined;
};

const describeFailures = (failures: ProviderFailure[]): string => {
  if (failures.length === 0) {
    return 'No providers were attempted.';
  }

  return failures.map((failure) => `${failure.provider}: ${failure.reason}`).join('; ');
};

const stringifyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const buildProviderError = (
  provider: FiatRateProviderName,
  message: string,
  cooldownMs?: number
): ProviderError => {
  const error = new Error(`[${provider}] ${message}`) as ProviderError;
  if (cooldownMs) {
    error.cooldownMs = cooldownMs;
  }
  return error;
};

const toProviderError = (error: unknown, provider: FiatRateProviderName): ProviderError => {
  if (isAbortError(error)) {
    return buildProviderError(provider, `timeout after ${PROVIDER_TIMEOUT_MS}ms`);
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const providerError = error as ProviderError;
    return providerError;
  }

  return buildProviderError(provider, String(error));
};

const isAbortError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
};

const fiatRateProviders: FiatRateProvider[] = [
  { name: 'coinbase', getRate: getCoinbaseFiatBtcRate },
  { name: 'bitpay', getRate: getBitpayFiatBtcRate },
  { name: 'blockchain', getRate: getBlockchainFiatBtcRate },
  { name: 'coingecko', getRate: getCoingeckoFiatBtcRate },
];

export type SupportedCypto = 'ETH';

export type SupportedCurrencies =
  | 'AED' // United Arab Emirates Dirham"
  | 'AFN' // Afghan Afghani"
  | 'ALL' // Albanian Lek"
  | 'AMD' // Armenian Dram"
  | 'ANG' // Netherlands Antillean Guilder"
  | 'AOA' // Angolan Kwanza"
  | 'ARS' // Argentine Peso"
  | 'AUD' // Australian Dollar"
  | 'AWG' // Aruban Florin"
  | 'AZN' // Azerbaijani Manat"
  | 'BAM' // Bosnia-Herzegovina Convertible Mark"
  | 'BBD' // Barbadian Dollar"
  | 'BDT' // Bangladeshi Taka"
  | 'BGN' // Bulgarian Lev"
  | 'BHD' // Bahraini Dinar"
  | 'BIF' // Burundian Franc"
  | 'BMD' // Bermudan Dollar"
  | 'BND' // Brunei Dollar"
  | 'BOB' // Bolivian Boliviano"
  | 'BRL' // Brazilian Real"
  | 'BSD' // Bahamian Dollar"
  | 'BTC' // Bitcoin"
  | 'BTN' // Bhutanese Ngultrum"
  | 'BWP' // Botswanan Pula"
  | 'BYR' // Belarusian Ruble"
  | 'BZD' // Belize Dollar"
  | 'CAD' // Canadian Dollar"
  | 'CDF' // Congolese Franc"
  | 'CHF' // Swiss Franc"
  | 'CLF' // Chilean Unit of Account (UF)"
  | 'CLP' // Chilean Peso"
  | 'CNY' // Chinese Yuan"
  | 'COP' // Colombian Peso"
  | 'CRC' // Costa Rican Col\u00f3n"
  | 'CUP' // Cuban Peso"
  | 'CVE' // Cape Verdean Escudo"
  | 'CZK' // Czech Republic Koruna"
  | 'DJF' // Djiboutian Franc"
  | 'DKK' // Danish Krone"
  | 'DOP' // Dominican Peso"
  | 'DZD' // Algerian Dinar"
  | 'EEK' // Estonian Kroon"
  | 'EGP' // Egyptian Pound"
  | 'ERN' // Eritrean Nnakfa"
  | 'ETB' // Ethiopian Birr"
  | 'EUR' // Euro"
  | 'FJD' // Fijian Dollar"
  | 'FKP' // Falkland Islands Pound"
  | 'GBP' // British Pound Sterling"
  | 'GEL' // Georgian Lari"
  | 'GHS' // Ghanaian Cedi"
  | 'GIP' // Gibraltar Pound"
  | 'GMD' // Gambian Dalasi"
  | 'GNF' // Guinean Franc"
  | 'GTQ' // Guatemalan Quetzal"
  | 'GYD' // Guyanaese Dollar"
  | 'HKD' // Hong Kong Dollar"
  | 'HNL' // Honduran Lempira"
  | 'HRK' // Croatian Kuna"
  | 'HTG' // Haitian Gourde"
  | 'HUF' // Hungarian Forint"
  | 'IDR' // Indonesian Rupiah"
  | 'ILS' // Israeli New Sheqel"
  | 'INR' // Indian Rupee"
  | 'IQD' // Iraqi Dinar"
  | 'IRR' // Iranian Rial"
  | 'ISK' // Icelandic Kr\u00f3na"
  | 'JEP' // Jersey Pound"
  | 'JMD' // Jamaican Dollar"
  | 'JOD' // Jordanian Dinar"
  | 'JPY' // Japanese Yen"
  | 'KES' // Kenyan Shilling"
  | 'KGS' // Kyrgystani Som"
  | 'KHR' // Cambodian Riel"
  | 'KMF' // Comorian Franc"
  | 'KPW' // North Korean Won"
  | 'KRW' // South Korean Won"
  | 'KWD' // Kuwaiti Dinar"
  | 'KYD' // Cayman Islands Dollar"
  | 'KZT' // Kazakhstani Tenge"
  | 'LAK' // Laotian Kip"
  | 'LBP' // Lebanese Pound"
  | 'LKR' // Sri Lankan Rupee"
  | 'LRD' // Liberian Dollar"
  | 'LSL' // Lesotho Loti"
  | 'LTL' // Lithuanian Litas"
  | 'LVL' // Latvian Lats"
  | 'LYD' // Libyan Dinar"
  | 'MAD' // Moroccan Dirham"
  | 'MDL' // Moldovan Leu"
  | 'MGA' // Malagasy Ariary"
  | 'MKD' // Macedonian Denar"
  | 'MMK' // Myanma Kyat"
  | 'MNT' // Mongolian Tugrik"
  | 'MOP' // Macanese Pataca"
  | 'MRO' // Mauritanian Ouguiya"
  | 'MTL' // Maltese Lira"
  | 'MUR' // Mauritian Rupee"
  | 'MVR' // Maldivian Rufiyaa"
  | 'MWK' // Malawian Kwacha"
  | 'MXN' // Mexican Peso"
  | 'MYR' // Malaysian Ringgit"
  | 'MZN' // Mozambican Metical"
  | 'NAD' // Namibian Dollar"
  | 'NGN' // Nigerian Naira"
  | 'NIO' // Nicaraguan C\u00f3rdoba"
  | 'NOK' // Norwegian Krone"
  | 'NPR' // Nepalese Rupee"
  | 'NZD' // New Zealand Dollar"
  | 'OMR' // Omani Rial"
  | 'PAB' // Panamanian Balboa"
  | 'PEN' // Peruvian Nuevo Sol"
  | 'PGK' // Papua New Guinean Kina"
  | 'PHP' // Philippine Peso"
  | 'PKR' // Pakistani Rupee"
  | 'PLN' // Polish Zloty"
  | 'PYG' // Paraguayan Guarani"
  | 'QAR' // Qatari Rial"
  | 'RON' // Romanian Leu"
  | 'RSD' // Serbian Dinar"
  | 'RUB' // Russian Ruble"
  | 'RWF' // Rwandan Franc"
  | 'SAR' // Saudi Riyal"
  | 'SBD' // Solomon Islands Dollar"
  | 'SCR' // Seychellois Rupee"
  | 'SDG' // Sudanese Pound"
  | 'SEK' // Swedish Krona"
  | 'SGD' // Singapore Dollar"
  | 'SHP' // Saint Helena Pound"
  | 'SLL' // Sierra Leonean Leone"
  | 'SOS' // Somali Shilling"
  | 'SRD' // Surinamese Dollar"
  | 'STD' // S\u00e3o Tom\u00e9 and Pr\u00edncipe Dobra"
  | 'SVC' // Salvadoran Col\u00f3n"
  | 'SYP' // Syrian Pound"
  | 'SZL' // Swazi Lilangeni"
  | 'THB' // Thai Baht"
  | 'TJS' // Tajikistani Somoni"
  | 'TMT' // Turkmenistani Manat"
  | 'TND' // Tunisian Dinar"
  | 'TOP' // Tongan Pa?anga"
  | 'TRY' // Turkish Lira"
  | 'TTD' // Trinidad and Tobago Dollar"
  | 'TWD' // New Taiwan Dollar"
  | 'TZS' // Tanzanian Shilling"
  | 'UAH' // Ukrainian Hryvnia"
  | 'UGX' // Ugandan Shilling"
  | 'USD' // United States Dollar"
  | 'UYU' // Uruguayan Peso"
  | 'UZS' // Uzbekistan Som"
  | 'VEF' // Venezuelan Bol\u00edvar Fuerte"
  | 'VND' // Vietnamese Dong"
  | 'VUV' // Vanuatu Vatu"
  | 'WST' // Samoan Tala"
  | 'XAF' // CFA Franc BEAC"
  | 'XAG' // Silver (troy ounce)"
  | 'XAU' // Gold (troy ounce)"
  | 'XBT' // Bitcoin"
  | 'XCD' // East Caribbean Dollar"
  | 'XDR' // Special Drawing Rights"
  | 'XOF' // CFA Franc BCEAO"
  | 'XPF' // CFP Franc"
  | 'YER' // Yemeni Rial"
  | 'ZAR' // South African Rand"
  | 'ZMK' // Zambian Kwacha (pre-2013)"
  | 'ZMW' // Zambian Kwacha"
  | 'ZWL'; // Zimbabwean Dollar"

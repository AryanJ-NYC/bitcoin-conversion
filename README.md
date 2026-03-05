# Bitcoin Conversion

[![npm](https://img.shields.io/npm/v/bitcoin-conversion?style=plastic)](https://www.npmjs.com/package/bitcoin-conversion)

Simple to use library that takes care of all your bitcoin conversions. Convert to and from bitcoin, satoshis and fiat.

<!--ts-->
* [Bitcoin Conversion](#bitcoin-conversion)
   * [Installation](#installation)
   * [Usage](#usage)
      * [Bitcoin to Fiat](#bitcoin-to-fiat)
         * [API](#api)
         * [Example](#example)
      * [Bitcoin to Satoshis](#bitcoin-to-satoshis)
         * [API](#api-1)
         * [Example](#example-1)
      * [Satoshis to Bitcoin](#satoshis-to-bitcoin)
         * [API](#api-2)
         * [Example](#example-2)
      * [Satoshis to Fiat](#satoshis-to-fiat)
         * [API](#api-3)
         * [Example](#example-3)
      * [Fiat to Bitcoin](#fiat-to-bitcoin)
         * [API](#api-4)
         * [Example](#example-4)
      * [Fiat to Satoshis](#fiat-to-satoshis)
         * [API](#api-5)
         * [Example](#example-5)
   * [Supported Currencies](#supported-currencies)
   * [Acknowledgements](#acknowledgements)

<!-- Created by https://github.com/ekalinin/github-markdown-toc -->
<!-- Added by: runner, at: Thu Mar  5 04:55:08 UTC 2026 -->

<!--te-->

## Installation

```bash
yarn add bitcoin-conversion
npm install bitcoin-conversion
```

## Usage

Note that all functions converting to or from fiat return a `Promise`. This is because they call live BTC/fiat rate APIs.

Fiat rate lookup uses fallback providers in this order: Coinbase, BitPay, Blockchain.com, then CoinGecko. Rates are cached for 60 seconds, and the last cached rate (up to 10 minutes old) is used when all live providers fail.

Raw fiat rates are normalized to canonical numeric strings for precision. If you need display formatting (currency symbols, grouping, fixed decimals), format the result in your application layer.

Conversion math uses native JavaScript number arithmetic. This keeps the package lightweight and dependency-free, but tiny floating-point artifacts can occur in edge cases.

### Bitcoin to Fiat

#### API

```typescript
bitcoinToFiat(amountInBtc: number | string, convertTo: SupportedCurrencies): Promise<number>;
```

#### Example

```typescript
import { bitcoinToFiat } from 'bitcoin-conversion';

const paymentInUsd = await bitcoinToFiat('0.00005', 'USD'); // needs await since calling live rate APIs
const paymentInGbp = await bitcoinToFiat(0.1, 'GBP'); // needs await since calling live rate APIs
```

### Bitcoin to Satoshis

#### API

```typescript
bitcoinToSatoshis(amountInBtc: number | string): number;
```

#### Example

```typescript
import { bitcoinToSatoshis } from 'bitcoin-conversion';

// number or string allowed
const paymentInSats = bitcoinToSatoshis('0.00005');
const paymentInSats = bitcoinToSatoshis(0.5);
```

### Satoshis to Bitcoin

#### API

```typescript
satoshisToBitcoin(amountInSatoshis: number | string): number;
```

#### Example

```typescript
import { satoshisToBitcoin } from 'bitcoin-conversion';

// number or string allowed
const paymentInBtc = satoshisToBitcoin('100000000');
const paymentInBtc = satoshisToBitcoin(50000);
```

### Satoshis to Fiat

#### API

```typescript
satoshisToFiat(amountInSatoshis: number | string, convertTo: SupportedCurrencies): Promise<number>;
```

#### Example

```typescript
import { satoshisToFiat } from 'bitcoin-conversion';

// number or string allowed
const paymentInUsd = await satoshisToFiat('100000000', 'USD'); // needs await since calling live rate APIs
const paymentInGbp = await satoshisToFiat(50000, 'GBP'); // needs await since calling live rate APIs
```

### Fiat to Bitcoin

#### API

```typescript
fiatToBitcoin(amountInCurrency: number | string, convertFrom: SupportedCurrencies): Promise<number>;
```

#### Example

```typescript
import { fiatToBitcoin } from 'bitcoin-conversion';

// number or string allowed
const paymentInBtcFromUsd = await fiatToBitcoin('100000000', 'USD'); // needs await since calling live rate APIs
const paymentInBtcFromGbp = await fiatToBitcoin(50000, 'GBP'); // needs await since calling live rate APIs
```

### Fiat to Satoshis

#### API

```typescript
fiatToSatoshis(amountInCurrency: number | string, convertFrom: SupportedCurrencies): Promise<number>;
```

#### Example

```typescript
import { fiatToSatoshis } from 'bitcoin-conversion';

// number or string allowed
const paymentInSatsFromUsd = await fiatToSatoshis('100000000', 'USD'); // needs await since calling live rate APIs
const paymentInSatsFromGbp = await fiatToSatoshis(50000, 'GBP'); // needs await since calling live rate APIs
```

## Supported Currencies

```typescript
type SupportedCurrencies =
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
```

## Acknowledgements

Fiat conversion rates are sourced from free public APIs including [Coinbase](https://docs.cdp.coinbase.com/coinbase-business/track-apis/prices), [BitPay](https://bitpay.com/api/#rest-api-resources-rates), [Blockchain.com](https://www.blockchain.com/explorer/api/exchange_rates_api), and [CoinGecko](https://docs.coingecko.com/reference/simple-price).

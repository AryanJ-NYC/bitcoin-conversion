export default (url: string) => ({
  status: 200,
  json() {
    if (url === 'https://api.coindesk.com/v1/bpi/currentprice/usd.json') {
      return {
        bpi: { USD: { rate: '17000' } },
      };
    }
    if (url === 'https://xchain.io/api/asset/PEPECASH') {
      return {
        asset: 'PEPECASH',
        estimated_value: { btc: '0.00000045', usd: '0.02', xcp: '0.00197600' },
      };
    }
    if (url === 'https://xchain.io/api/asset/XCP') {
      return {
        asset: 'XCP',
        estimated_value: { btc: '0.00022868', usd: '9.61', xcp: '1.00000000' },
      };
    }
    return '';
  },
});

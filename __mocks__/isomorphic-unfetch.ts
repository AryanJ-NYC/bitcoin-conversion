export default (url: string) => ({
  status: 200,
  json() {
    if (url === 'https://api.coindesk.com/v1/bpi/currentprice/usd.json') {
      return {
        bpi: { USD: { rate: '17000' } },
      };
    }
    return '';
  },
});

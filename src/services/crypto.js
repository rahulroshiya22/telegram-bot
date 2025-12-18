const axios = require('axios');

class CryptoService {
    constructor() {
        this.baseUrl = 'https://api.coingecko.com/api/v3';
    }

    /**
     * Fetch top 10 coins data
     * @returns {Promise<string>} - Formatted JSON string of market data
     */
    async getMarketData() {
        try {
            const response = await axios.get(`${this.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 10,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h'
                }
            });

            const data = response.data.map(coin => ({
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                price: `$${coin.current_price.toLocaleString()}`,
                change_24h: `${coin.price_change_percentage_24h.toFixed(2)}%`,
                high_24h: `$${coin.high_24h.toLocaleString()}`,
                low_24h: `$${coin.low_24h.toLocaleString()}`
            }));

            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('CoinGecko Error:', error.message);
            throw new Error('Failed to fetch crypto data.');
        }
    }
}

module.exports = new CryptoService();

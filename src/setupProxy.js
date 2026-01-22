const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://localhost:5777',
            changeOrigin: true,
            pathRewrite: {
                '^/api': '/api' // keep /api prefix
            },
            // Increase timeout to 5 minutes (300000 ms) for long LLM generations
            proxyTimeout: 300000,
            timeout: 300000,
            onProxyRes: function (proxyRes, req, res) {
                // Log proxy response headers for debugging
                // console.log('Proxy received headers:', proxyRes.headers);
            },
            onError: function (err, req, res) {
                console.error('Proxy error:', err);
                res.status(500).send('Proxy Error: ' + err.message);
            }
        })
    );
};

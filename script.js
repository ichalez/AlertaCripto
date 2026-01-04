const CONFIG = {
    symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'],
    interval: '5m',
    rsiPeriod: 14,
    limit: 100, // Fetch enough to stabilize RSI
    binanceRest: 'https://api.binance.com/api/v3',
    binanceWs: 'wss://stream.binance.com:9443/ws'
};

const state = {};

/**
 * Initialize the state for each symbol
 */
function initState() {
    CONFIG.symbols.forEach(symbol => {
        state[symbol] = {
            prices: [],
            rsi: 0,
            lastRsi: 0,
            avgGain: 0,
            avgLoss: 0,
            alertActive: null // 'red', 'green', or null
        };
    });
}

/**
 * Calculate RSI for the initial historical data
 */
function calculateInitialRsi(symbol, klines) {
    const closes = klines.map(k => parseFloat(k[4]));
    let gains = [];
    let losses = [];

    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? Math.abs(diff) : 0);
    }

    // Initial avg gain/loss
    let avgGain = gains.slice(0, CONFIG.rsiPeriod).reduce((a, b) => a + b) / CONFIG.rsiPeriod;
    let avgLoss = losses.slice(0, CONFIG.rsiPeriod).reduce((a, b) => a + b) / CONFIG.rsiPeriod;

    // Wilder's Smoothing
    for (let i = CONFIG.rsiPeriod; i < gains.length; i++) {
        avgGain = (avgGain * (CONFIG.rsiPeriod - 1) + gains[i]) / CONFIG.rsiPeriod;
        avgLoss = (avgLoss * (CONFIG.rsiPeriod - 1) + losses[i]) / CONFIG.rsiPeriod;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    state[symbol].avgGain = avgGain;
    state[symbol].avgLoss = avgLoss;
    state[symbol].rsi = rsi;
    state[symbol].lastRsi = rsi;
}

/**
 * Update RSI with a new price point
 */
function updateRsi(symbol, currentPrice, isFinal) {
    const lastPrice = state[symbol].prices[state[symbol].prices.length - 1];
    if (!lastPrice) return;

    const diff = currentPrice - lastPrice;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    // Temporary update for display
    const tempAvgGain = (state[symbol].avgGain * (CONFIG.rsiPeriod - 1) + gain) / CONFIG.rsiPeriod;
    const tempAvgLoss = (state[symbol].avgLoss * (CONFIG.rsiPeriod - 1) + loss) / CONFIG.rsiPeriod;

    const rs = tempAvgGain / tempAvgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Update UI
    updateUI(symbol, rsi, currentPrice);

    // If candle is closed, commit values
    if (isFinal) {
        state[symbol].lastRsi = state[symbol].rsi;
        state[symbol].rsi = rsi;
        state[symbol].avgGain = tempAvgGain;
        state[symbol].avgLoss = tempAvgLoss;
        state[symbol].prices.push(currentPrice);
        if (state[symbol].prices.length > CONFIG.limit) state[symbol].prices.shift();

        checkAlert(symbol, rsi, state[symbol].lastRsi);
    }
}

/**
 * Check for RSI crosses
 */
function checkAlert(symbol, currentRsi, previousRsi) {
    const indicator = document.getElementById(`alert-${symbol}`);

    // Bearish Cross: RSI drops below 70 from above
    if (previousRsi >= 70 && currentRsi < 70) {
        setAlert(symbol, 'red');
    }
    // Bullish Cross: RSI rises above 30 from below
    else if (previousRsi <= 30 && currentRsi > 30) {
        setAlert(symbol, 'green');
    }
    // Clean up if back to neutral range
    else if (currentRsi > 35 && currentRsi < 65) {
        // Optional: clear alert after some time or specific condition
    }
}

function setAlert(symbol, type) {
    const indicator = document.getElementById(`alert-${symbol}`);
    const card = document.getElementById(`card-${symbol}`);

    indicator.classList.remove('alert-active-red', 'alert-active-green');

    if (type === 'red') {
        indicator.classList.add('alert-active-red');
        // Vibrate or sound could go here
    } else {
        indicator.classList.add('alert-active-green');
    }

    // Pulse effect
    card.style.borderColor = type === 'red' ? 'rgba(255, 71, 87, 0.5)' : 'rgba(46, 204, 113, 0.5)';
    setTimeout(() => {
        card.style.borderColor = '';
    }, 2000);
}

/**
 * Update the UI elements
 */
function updateUI(symbol, rsi, price) {
    const rsiText = document.getElementById(`rsi-${symbol}`);
    const priceText = document.getElementById(`price-${symbol}`);
    const progress = document.getElementById(`progress-${symbol}`);

    rsiText.textContent = rsi.toFixed(1);
    priceText.textContent = `$${parseFloat(price).toLocaleString()}`;

    // Gauge Animation
    // stroke-dashoffset: 0 is 100 RSI, 126 is 0 RSI
    const offset = 126 - (rsi / 100) * 126;
    progress.style.strokeDashoffset = offset;

    // Color of gauge based on RSI
    if (rsi >= 70) progress.style.stroke = 'var(--accent-red)';
    else if (rsi <= 30) progress.style.stroke = 'var(--accent-green)';
    else progress.style.stroke = 'var(--accent-blue)';
}

async function start() {
    initState();

    for (const symbol of CONFIG.symbols) {
        try {
            const resp = await fetch(`${CONFIG.binanceRest}/klines?symbol=${symbol}&interval=${CONFIG.interval}&limit=${CONFIG.limit}`);
            const data = await resp.json();

            state[symbol].prices = data.map(k => parseFloat(k[4]));
            calculateInitialRsi(symbol, data);
            updateUI(symbol, state[symbol].rsi, state[symbol].prices[state[symbol].prices.length - 1]);
        } catch (err) {
            console.error(`Error fetching data for ${symbol}:`, err);
        }
    }

    // Connect WebSocket
    const streams = CONFIG.symbols.map(s => `${s.toLowerCase()}@kline_${CONFIG.interval}`).join('/');
    const ws = new WebSocket(`${CONFIG.binanceWs}/${streams}`);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const symbol = msg.s;
        const kline = msg.k;
        const currentPrice = parseFloat(kline.c);
        const isFinal = kline.x;

        updateRsi(symbol, currentPrice, isFinal);
    };

    ws.onerror = (err) => console.error("WebSocket Error:", err);
    ws.onclose = () => {
        console.log("WebSocket closed, reconnecting...");
        setTimeout(start, 5000);
    };
}

document.addEventListener('DOMContentLoaded', start);

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { first_connect, price_store, subscribe_ticker, unsubscribe_ticker } from './stock_price/websocket_data.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'stocksense_super_secret_key_998877';

// Middleware
app.use(cors());
app.use(express.json());

// Database Connections
const USER_DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'go090312',
  database: 'user_db',
  charset: 'utf8mb4'
};

const STOCK_DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'go090312',
  database: 'stock_db',
  charset: 'utf8mb4'
};

const userPool = mysql.createPool(USER_DB_CONFIG);
const stockPool = mysql.createPool(STOCK_DB_CONFIG);

// JWT Verification Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

// Optional Auth Middleware for logging views
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

// Helpers
function formatVolume(vol) {
  if (!vol) return '0';
  const num = Number(vol);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toString();
}

function formatMarketCap(cap) {
  if (!cap) return '0';
  const num = Number(cap);
  if (num >= 1000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  }
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + 'B';
  }
  return num.toString();
}

function formatDateOnly(date) {
  if (typeof date === 'string') return date.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── AUTHENTICATION ENDPOINTS ───────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing name, email, or password' });
  }

  try {
    const [existing] = await userPool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await userPool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;
    const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    // Save session record
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userPool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    res.json({ token, user: { id: userId, name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const [rows] = await userPool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    // Save session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userPool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  try {
    await userPool.query('DELETE FROM user_sessions WHERE token = ?', [token]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── WATCHLIST ENDPOINTS ─────────────────────────────────────────────────────

app.get('/api/watchlist', authenticateToken, async (req, res) => {
  try {
    const [rows] = await userPool.query('SELECT ticker FROM user_watchlist WHERE user_id = ?', [req.user.id]);
    res.json({ watchlist: rows.map(r => r.ticker) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/watchlist/toggle', authenticateToken, async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  try {
    const [existing] = await userPool.query(
      'SELECT * FROM user_watchlist WHERE user_id = ? AND ticker = ?',
      [req.user.id, symbol]
    );

    if (existing.length > 0) {
      await userPool.query('DELETE FROM user_watchlist WHERE user_id = ? AND ticker = ?', [req.user.id, symbol]);
      res.json({ starred: false, symbol });
    } else {
      await userPool.query('INSERT INTO user_watchlist (user_id, ticker) VALUES (?, ?)', [req.user.id, symbol]);
      res.json({ starred: true, symbol });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── STOCKS DATA ENDPOINTS ───────────────────────────────────────────────────

app.get('/api/stocks', async (req, res) => {
  try {
    // 1. Get latest prices from DB
    const [prices] = await stockPool.query(`
      SELECT dp.*, ci.name, ci.market 
      FROM daily_price dp 
      JOIN company_info ci ON dp.ticker = ci.ticker 
      WHERE dp.date = (SELECT MAX(date) FROM daily_price)
    `);

    // 2. Get latest AI signals
    const [signals] = await stockPool.query(`
      SELECT ticker, \`signal\`, prob_buy, prob_sell, prob_neutral, explanation
      FROM ai_signal
      WHERE date = (SELECT MAX(date) FROM ai_signal)
    `);

    const signalMap = {};
    signals.forEach(s => {
      signalMap[s.ticker] = s;
    });

    const stockList = prices.map(p => {
      let price = Number(p.stock_close);
      let open = Number(p.stock_open);
      let high = Number(p.stock_high);
      let low = Number(p.stock_low);
      // Default: the stored daily change (latest close vs previous close).
      let changePct = Number(p.stock_change || 0);
      let prevClose = changePct !== 0 ? price / (1 + (changePct / 100)) : price;
      let change = price - prevClose;

      // Overlay live data when available. The feed carries the authoritative
      // day-over-day change (전일대비/전일대비율), so use it directly rather than
      // subtracting against the stored close (which may be several days stale).
      const liveData = price_store.get(p.ticker);
      const livePrice = liveData ? Number(liveData.current_price) : 0;
      if (livePrice > 0) {
        price = livePrice;
        open = Number(liveData.open_price) || open;
        high = Number(liveData.high_price) || high;
        low = Number(liveData.low_price) || low;
        if (liveData.change_pct !== undefined && liveData.change_pct !== '') {
          changePct = Number(liveData.change_pct);
          change = Number(liveData.change);
        }
      }

      const signalInfo = signalMap[p.ticker] || { signal: 'neutral', explanation: '' };

      return {
        symbol: p.ticker,
        name: p.name,
        market: p.market,
        price,
        open,
        high,
        low,
        change: Math.round(change),
        changePct: Number(changePct.toFixed(2)),
        volume: formatVolume(p.stock_volume),
        volumeRaw: Number(p.stock_volume) || 0,
        recommendation: signalInfo.signal.toLowerCase(),
        explanation: signalInfo.explanation
      };
    });

    res.json({ stocks: stockList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stocks/:symbol', optionalAuthenticate, async (req, res) => {
  const { symbol } = req.params;

  try {
    const [company] = await stockPool.query('SELECT * FROM company_info WHERE ticker = ?', [symbol]);
    if (company.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const [priceRows] = await stockPool.query(
      'SELECT * FROM daily_price WHERE ticker = ? ORDER BY date DESC LIMIT 2',
      [symbol]
    );
    if (priceRows.length === 0) {
      return res.status(404).json({ error: 'Price data not found' });
    }

    const latestPrice = priceRows[0];
    const prevPrice = priceRows[1] || latestPrice;

    const [fundamentalRows] = await stockPool.query(
      'SELECT * FROM daily_fundamental WHERE ticker = ? ORDER BY date DESC LIMIT 1',
      [symbol]
    );
    const fundamental = fundamentalRows[0] || {};

    const [investorRows] = await stockPool.query(
      'SELECT * FROM daily_investor WHERE ticker = ? ORDER BY date DESC LIMIT 1',
      [symbol]
    );
    const investor = investorRows[0] || {};

    const [shortingRows] = await stockPool.query(
      'SELECT * FROM daily_shorting WHERE ticker = ? ORDER BY date DESC LIMIT 1',
      [symbol]
    );
    const shorting = shortingRows[0] || {};

    const [signalRows] = await stockPool.query(
      'SELECT * FROM ai_signal WHERE ticker = ? ORDER BY date DESC LIMIT 1',
      [symbol]
    );
    const signal = signalRows[0] || {};

    const [rangeRows] = await stockPool.query(`
      SELECT MAX(stock_close) as week_high, MIN(stock_close) as week_low
      FROM daily_price
      WHERE ticker = ? AND date >= DATE_SUB((SELECT MAX(date) FROM daily_price WHERE ticker = ?), INTERVAL 1 YEAR)
    `, [symbol, symbol]);
    const range = rangeRows[0] || { week_high: null, week_low: null };

    // Overlay live price
    let price = Number(latestPrice.stock_close);
    let open = Number(latestPrice.stock_open);
    let high = Number(latestPrice.stock_high);
    let low = Number(latestPrice.stock_low);
    // Default: stored change vs the actual previous trading day's close.
    let changePct = Number(latestPrice.stock_change || 0);
    let prevClose = prevPrice ? Number(prevPrice.stock_close) : price;
    let change = price - prevClose;

    // Overlay live data when available; use the feed's own day-over-day change
    // (전일대비/전일대비율) rather than subtracting against a possibly-stale close.
    const liveData = price_store.get(symbol);
    const livePrice = liveData ? Number(liveData.current_price) : 0;
    if (livePrice > 0) {
      price = livePrice;
      open = Number(liveData.open_price) || open;
      high = Number(liveData.high_price) || high;
      low = Number(liveData.low_price) || low;
      if (liveData.change_pct !== undefined && liveData.change_pct !== '') {
        changePct = Number(liveData.change_pct);
        change = Number(liveData.change);
      }
    }

    const aiSignalText = (signal.signal || 'neutral').toUpperCase();

    // Log user view if authenticated
    if (req.user) {
      try {
        await userPool.query(
          'INSERT INTO user_ai_views (user_id, ticker, ai_signal) VALUES (?, ?, ?)',
          [req.user.id, symbol, aiSignalText]
        );
      } catch (err) {
        console.error('Failed to log user view:', err.message);
      }
    }

    res.json({
      symbol,
      name: company[0].name,
      market: company[0].market,
      price,
      open,
      high,
      low,
      change: Math.round(change),
      changePct: Number(changePct.toFixed(2)),
      volume: formatVolume(latestPrice.stock_volume),
      marketCap: formatMarketCap(latestPrice.market_cap),
      weekHigh: Number(range.week_high || latestPrice.stock_close),
      weekLow: Number(range.week_low || latestPrice.stock_close),
      per: fundamental.per ? Number(fundamental.per) : null,
      pbr: fundamental.pbr ? Number(fundamental.pbr) : null,
      roe: (fundamental.eps && fundamental.bps)
        ? Number(((fundamental.eps / fundamental.bps) * 100).toFixed(2))
        : null,
      ai: {
        signal: aiSignalText,
        explanation: signal.explanation || 'The AI sees no clear direction for this stock based on current inputs.',
        prob_buy: signal.prob_buy ? Number(signal.prob_buy) : 0.33,
        prob_sell: signal.prob_sell ? Number(signal.prob_sell) : 0.33,
        prob_neutral: signal.prob_neutral ? Number(signal.prob_neutral) : 0.34,
        reasons: typeof signal.reasons === 'string' ? JSON.parse(signal.reasons) : (signal.reasons || [])
      },
      fundamental,
      investor,
      shorting
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stocks/:symbol/chart', async (req, res) => {
  const { symbol } = req.params;
  // interval = 'day' | 'week' | 'month' | 'year'
  // Each chart point is one bucket; for week/month/year we take the close of
  // the last trading day in that bucket. 'day' is simply daily closes.
  const { interval } = req.query;

  let limit;
  let sql;
  let params;
  if (interval === 'week') {
    limit = 26;
    sql = `
      SELECT date, stock_close FROM daily_price
      WHERE ticker = ? AND date IN (
        SELECT MAX(date) FROM daily_price WHERE ticker = ? GROUP BY YEARWEEK(date, 3))
      ORDER BY date DESC LIMIT ?`;
    params = [symbol, symbol, limit];
  } else if (interval === 'month') {
    limit = 24;
    sql = `
      SELECT date, stock_close FROM daily_price
      WHERE ticker = ? AND date IN (
        SELECT MAX(date) FROM daily_price WHERE ticker = ? GROUP BY YEAR(date), MONTH(date))
      ORDER BY date DESC LIMIT ?`;
    params = [symbol, symbol, limit];
  } else if (interval === 'year') {
    limit = 20;
    sql = `
      SELECT date, stock_close FROM daily_price
      WHERE ticker = ? AND date IN (
        SELECT MAX(date) FROM daily_price WHERE ticker = ? GROUP BY YEAR(date))
      ORDER BY date DESC LIMIT ?`;
    params = [symbol, symbol, limit];
  } else {
    // 'day' (default): most recent daily closes (generous window)
    limit = 90;
    sql = 'SELECT date, stock_close FROM daily_price WHERE ticker = ? ORDER BY date DESC LIMIT ?';
    params = [symbol, limit];
  }

  try {
    const [rows] = await stockPool.query(sql, params);

    const chartData = rows.reverse().map(r => ({
      date: formatDateOnly(r.date),
      close: Number(r.stock_close)
    }));

    // Overlay the live intraday price onto the most recent point so the chart
    // reflects current market movement. If today already has a stored row we
    // update it; otherwise we append today's live point.
    const liveData = price_store.get(symbol);
    const livePrice = liveData ? Number(liveData.current_price) : 0;
    if (livePrice > 0 && chartData.length > 0) {
      const today = formatDateOnly(new Date());
      const lastPoint = chartData[chartData.length - 1];
      if (lastPoint.date === today) {
        lastPoint.close = livePrice;
      } else {
        chartData.push({ date: today, close: livePrice });
      }
    }

    res.json({ chartData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── LIVE QUOTE + SUBSCRIPTION ENDPOINTS ─────────────────────────────────────

// Lightweight live price for polling (price/change/OHLC only).
app.get('/api/stocks/:symbol/quote', async (req, res) => {
  const { symbol } = req.params;
  try {
    const [priceRows] = await stockPool.query(
      'SELECT * FROM daily_price WHERE ticker = ? ORDER BY date DESC LIMIT 2',
      [symbol]
    );
    if (priceRows.length === 0) {
      return res.status(404).json({ error: 'Price data not found' });
    }

    const latestPrice = priceRows[0];
    const prevPrice = priceRows[1] || latestPrice;

    let price = Number(latestPrice.stock_close);
    let open = Number(latestPrice.stock_open);
    let high = Number(latestPrice.stock_high);
    let low = Number(latestPrice.stock_low);
    let changePct = Number(latestPrice.stock_change || 0);
    let change = price - Number(prevPrice.stock_close);
    let live = false;

    const liveData = price_store.get(symbol);
    const livePrice = liveData ? Number(liveData.current_price) : 0;
    if (livePrice > 0) {
      live = true;
      price = livePrice;
      open = Number(liveData.open_price) || open;
      high = Number(liveData.high_price) || high;
      low = Number(liveData.low_price) || low;
      if (liveData.change_pct !== undefined && liveData.change_pct !== '') {
        changePct = Number(liveData.change_pct);
        change = Number(liveData.change);
      }
    }

    res.json({
      symbol,
      price,
      open,
      high,
      low,
      change: Math.round(change),
      changePct: Number(changePct.toFixed(2)),
      live
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscribe / unsubscribe a ticker to the live websocket feed based on whether
// a user is currently viewing it.
app.post('/api/stocks/:symbol/subscribe', (req, res) => {
  const ok = subscribe_ticker(req.params.symbol);
  res.json({ subscribed: ok });
});

app.post('/api/stocks/:symbol/unsubscribe', (req, res) => {
  const ok = unsubscribe_ticker(req.params.symbol);
  res.json({ unsubscribed: ok });
});

// ─── MARKET DATA ENDPOINTS ───────────────────────────────────────────────────

app.get('/api/market/chart', async (req, res) => {
  // interval = 'day' | 'week' | 'month' | 'year'
  // Each chart point is one bucket; for week/month/year we take the close of
  // the last trading day in that bucket. 'day' is simply daily closes.
  const { interval } = req.query;

  let limit;
  let sql;
  if (interval === 'week') {
    limit = 26;
    sql = `
      SELECT date, market_end FROM market_index
      WHERE date IN (SELECT MAX(date) FROM market_index GROUP BY YEARWEEK(date, 3))
      ORDER BY date DESC LIMIT ?`;
  } else if (interval === 'month') {
    limit = 24;
    sql = `
      SELECT date, market_end FROM market_index
      WHERE date IN (SELECT MAX(date) FROM market_index GROUP BY YEAR(date), MONTH(date))
      ORDER BY date DESC LIMIT ?`;
  } else if (interval === 'year') {
    limit = 20;
    sql = `
      SELECT date, market_end FROM market_index
      WHERE date IN (SELECT MAX(date) FROM market_index GROUP BY YEAR(date))
      ORDER BY date DESC LIMIT ?`;
  } else {
    // 'day' (default): most recent daily closes
    limit = 30;
    sql = 'SELECT date, market_end FROM market_index ORDER BY date DESC LIMIT ?';
  }

  try {
    const [rows] = await stockPool.query(sql, [limit]);

    const chartData = rows.reverse().map(r => ({
      date: formatDateOnly(r.date),
      close: Number(r.market_end)
    }));

    res.json({ chartData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Express Server & initialize WebSocket connections
app.listen(PORT, () => {
  console.log(`Express API Server listening on port ${PORT}`);
  
  // Connect to Korea Investment live WebSocket API
  try {
    first_connect()
      .then(() => {
        console.log('Successfully connected to Korea Investment WebSocket client.');
      })
      .catch(err => {
        console.error('Warning: Failed to establish Korea Investment websocket client:', err.message);
      });
  } catch (err) {
    console.error('Warning: Failed to call first_connect:', err.message);
  }
});

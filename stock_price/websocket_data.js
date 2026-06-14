const api_key = 'https://openapi.koreainvestment.com:9443';
const domain = 'ws://ops.koreainvestment.com:21000';
const APP_KEY = 'PSpn4hxPrrmFkwJw9AuT1lHZfA4q0IclWylq';
const APP_SECRET = 'Tf6mJafBlISGWKWzJ90pOch7Dj+o4ysiIccBdimUIs6MvbfXzHM8sOoW2hbWCXgzqn6tnx9NRrkyQQE1DLg573+qNkkj/0bUyIfFnVBIH2JPR02evPESr2MNMptDupzWtkvJszxjVUq7/UyWrM7RakCTjo2bown5eWZmTG0HJePihBd1nG4=';
import mysql from 'mysql2';
import WebSocket from 'ws';

const DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'go090312', // your DB password
    'database': 'stock_db', // your DB
    'charset': 'utf8mb4'
}

const pool = mysql.createPool(DB_CONFIG).promise();
const limit = 40;
const price_store = new Map();
const REST_REQUEST_DELAY_MS = 300;
const REST_RATE_LIMIT_BACKOFF_MS = 1200;
const REST_MAX_RETRIES = 2;

let token_table_ready = null;
function ensure_token_table(){
    if (!token_table_ready){
        token_table_ready = pool.query(`
            CREATE TABLE IF NOT EXISTS api_token (
                token_type  VARCHAR(20)  NOT NULL,
                token       TEXT         NOT NULL,
                expires_at  DATETIME     NOT NULL,
                updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (token_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }
    return token_table_ready;
}

async function read_cached_token(type){
    await ensure_token_table();
    const [rows] = await pool.query(
        'SELECT token FROM api_token WHERE token_type = ? AND expires_at > (NOW() + INTERVAL 60 SECOND)',
        [type]
    );
    return rows.length ? rows[0].token : null;
}

async function save_token(type, token, ttl_seconds){
    await ensure_token_table();
    const expires_at = new Date(Date.now() + ttl_seconds * 1000);
    await pool.query(
        `INSERT INTO api_token (token_type, token, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
        [type, token, expires_at]
    );
}

async function get_websocket_key(){
    const cached = await read_cached_token('websocket');
    if (cached) return cached;

    const response = await fetch(
        api_key + '/oauth2/Approval', {
            method : 'POST',
            headers : { 'content-type' : 'application/json' },
            body : JSON.stringify({
                grant_type : 'client_credentials',
                appkey : APP_KEY,
                secretkey : APP_SECRET
            })
        }
    );
    const data = await response.json();
    if (data.approval_key){
        await save_token('websocket', data.approval_key, 86400); // approval_key valid ~24h
    }
    return data.approval_key;
}

async function get_rest_key(force = false){
    if (!force){
        const cached = await read_cached_token('rest');
        if (cached) return cached;
    }

    const response = await fetch(
        api_key + '/oauth2/tokenP', {
            method : 'POST',
            headers : { 'content-type' : 'application/json' },
            body : JSON.stringify({
                grant_type : 'client_credentials',
                appkey : APP_KEY,
                appsecret : APP_SECRET
            })
        }
    );
    const data = await response.json();
    if (data.access_token){
        await save_token('rest', data.access_token, Number(data.expires_in) || 86400);
    }
    return data.access_token;
}

function websocket_message(websocket_key, ticker, tr_type){
    return JSON.stringify({
        header:{
            'approval_key' : websocket_key,
            'custtype' : 'P',
            'tr_type' : tr_type,
            'content-type' : 'utf-8'
        },
        body:{
            input:{
                'tr_id' : 'H0UNCNT0',
                'tr_key' : ticker
            }
        }
    })
}

async function rest_get_price(rest_key, ticker){
    const params = new URLSearchParams({
        'FID_COND_MRKT_DIV_CODE' : 'UN',
        'FID_INPUT_ISCD' : ticker
    });
    const response = await fetch(
        api_key + '/uapi/domestic-stock/v1/quotations/inquire-price?' + params, {
            method : 'GET',
            headers : {
                'content-type' : 'application/json; charset=utf-8',
                'authorization' : 'Bearer ' + rest_key,
                'appkey' : APP_KEY,
                'appsecret' : APP_SECRET,
                'tr_id' : 'FHKST01010100',
                'custtype' : 'P'
            }
        }
    );
    const data = await response.json();
    if (!response.ok || data.rt_cd !== '0'){
        const error = new Error(data.msg1 || ('HTTP ' + response.status));
        error.status = response.status;
        error.msg_cd = data.msg_cd;
        error.rt_cd = data.rt_cd;
        throw error;
    }
    const current_price = data.output.stck_prpr;
    const open_price = data.output.stck_oprc;
    const low_price = data.output.stck_lwpr;
    const high_price = data.output.stck_hgpr;
    const change = data.output.prdy_vrss;      // change vs previous close (already signed)
    const change_pct = data.output.prdy_ctrt;  // percent change vs previous close (already signed)
    return { current_price, open_price, low_price, high_price, change, change_pct };
}

function is_rate_limit_error(error){
    return (
        error &&
        typeof error.message === 'string' &&
        error.message.includes('초당 거래건수')
    );
}

function handle_message(websocket, data){
    if (data[0] === '0' || data[0] === '1'){
        const [flag, tr_id, data_count, body] = data.split('|');
        const fields = body.split('^');
        const count = parseInt(data_count, 10) || 1;
        const size = Math.floor(fields.length / count);
        for (let i = 0; i < count; i++){
            const response = fields.slice(i * size, (i + 1) * size);
            if (!response[0]) continue;
            // H0UNCNT0 fields: [3]=전일대비부호 [4]=전일대비(절대값) [5]=전일대비율
            // sign 4(하한)/5(하락) means a negative move; apply it to the magnitudes.
            const negative = response[3] === '4' || response[3] === '5';
            price_store.set(response[0], {
                current_price : response[2],
                open_price : response[7],
                low_price : response[9],
                high_price : response[8],
                change : (negative ? '-' : '') + response[4],
                change_pct : (negative ? '-' : '') + response[5]
            });
        }
        return;
    }

    let message;
    try {
        message = JSON.parse(data);
    } catch (err) {
        console.error('failed to parse message:', data);
        return;
    }

    const tr_id = message.header && message.header.tr_id;
    if (tr_id === 'PINGPONG'){
        websocket.pong(data);
        return;
    }

    const rt_cd = message.body && message.body.rt_cd;
    if (rt_cd !== undefined && rt_cd !== '0'){
        console.error('subscribe failed:', message.body.msg1);
    }
}

async function set_websocket(){
    const [rows] = await pool.query(
        "SELECT ticker FROM daily_price WHERE date = (SELECT MAX(date) FROM daily_price) ORDER BY stock_volume DESC"
    );
    const tickers = rows.map(row => row.ticker);
    const hot = new Set(tickers.slice(0, limit));
    const cold = new Set(tickers.slice(limit));
    return { first: new Set(), hot, cold, fixed: new Set() };
}

// Reference to the live connection so view-based subscribe/unsubscribe can
// reach the current websocket + state (conn.websocket is swapped on reconnect).
let active_conn = null;

// Reference-counted set of tickers currently being viewed, so concurrent
// viewers of the same stock don't unsubscribe each other.
const view_counts = new Map();

function can_send(){
    return active_conn
        && active_conn.websocket
        && active_conn.websocket.readyState === WebSocket.OPEN;
}

// Called when a user opens a stock detail page.
function subscribe_ticker(ticker){
    const next = (view_counts.get(ticker) || 0) + 1;
    view_counts.set(ticker, next);
    if (next > 1) return true;            // already subscribed by another viewer
    if (!can_send()) return false;
    try {
        add_websocket(active_conn.state, ticker, active_conn.websocket, active_conn.websocket_key);
        return true;
    } catch (err) {
        console.error('subscribe_ticker failed for', ticker, '-', err.message);
        return false;
    }
}

// Called when a user leaves a stock detail page.
function unsubscribe_ticker(ticker){
    const current = view_counts.get(ticker) || 0;
    if (current <= 0) return false;
    if (current > 1){                     // still being viewed elsewhere
        view_counts.set(ticker, current - 1);
        return true;
    }
    view_counts.delete(ticker);
    if (!can_send()) return false;
    try {
        delete_websocket(active_conn.state, ticker, active_conn.websocket, active_conn.websocket_key);
        return true;
    } catch (err) {
        console.error('unsubscribe_ticker failed for', ticker, '-', err.message);
        return false;
    }
}

async function first_connect(){
    const websocket_key = await get_websocket_key();
    const state = await set_websocket();
    const conn = { websocket: null, websocket_key, state };
    active_conn = conn;

    function connect(){
        const websocket = new WebSocket(domain);
        conn.websocket = websocket;
        let keepalive;

        websocket.on('open', () => {
            const to_subscribe = new Set([...state.hot, ...[...state.fixed].filter(t => !state.hot.has(t))]);
            for (const ticker of to_subscribe) { websocket.send(websocket_message(websocket_key, ticker, '1')); }
            keepalive = setInterval(() => {
                if (websocket.readyState === WebSocket.OPEN) { websocket.ping(); }
            }, 60000);
        });

        websocket.on('message', (data) => handle_message(websocket, data.toString()));
        websocket.on('error', (error) => console.error('websocket error:', error));
        websocket.on('close', () => {
            clearInterval(keepalive);
            console.log('websocket closed, reconnecting in 5s');
            setTimeout(connect, 5000);
        });
    }

    connect();
    start_rest(state);
    return conn;
}

function delete_websocket(state, ticker, websocket, websocket_key){
    const {first, hot, cold, fixed} = state;
    if (fixed.has(ticker)){
        if (hot.has(ticker)){
            fixed.delete(ticker);
            return state;
        }
        fixed.delete(ticker);
        cold.add(ticker);
        websocket.send(websocket_message(websocket_key, ticker, '2'));

        if (first.size > 0){
            const last = [...first].at(-1);
            cold.delete(last);
            first.delete(last);
            hot.add(last);
            websocket.send(websocket_message(websocket_key, last, '1'));
        }
    }
    return state;
}

function add_websocket(state, ticker, websocket, websocket_key){
    const {first, hot, cold, fixed} = state;
    if (hot.has(ticker)){
        fixed.add(ticker);
        return state;
    }
    if (cold.has(ticker)){
        const last = [...hot].reverse().find(stock => !fixed.has(stock));
        if (!last) { return state; }

        fixed.add(ticker);
        cold.delete(ticker);
        hot.delete(last);
        websocket.send(websocket_message(websocket_key, last, '2'));
        first.add(last);
        cold.add(last);
        websocket.send(websocket_message(websocket_key, ticker, '1'));
        return state;
    }
    return state;
}

async function start_rest(state){
    const request_delay = REST_REQUEST_DELAY_MS;
    let running  = true;
    let rest_key = await get_rest_key();
    let last_token_refresh = Date.now();

    async function refresh_token(){
        if (Date.now() - last_token_refresh < 60000) return;
        try {
            rest_key = await get_rest_key(true); // force re-issue; the cached one is expired
            last_token_refresh = Date.now();
        } catch (err) {
            console.error('failed to refresh rest_key:', err.message);
        }
    }

    async function loop(){
        while (running){
            const snapshot = [...state.cold];
            for (const ticker of snapshot){
                if (!running) break;
                if (!state.cold.has(ticker)) continue;
                try {
                    let price = null;
                    for (let attempt = 0; attempt <= REST_MAX_RETRIES; attempt++){
                        try {
                            price = await rest_get_price(rest_key, ticker);
                            break;
                        } catch (err) {
                            if (is_rate_limit_error(err) && attempt < REST_MAX_RETRIES){
                                await sleep(REST_RATE_LIMIT_BACKOFF_MS * (attempt + 1));
                                continue;
                            }
                            throw err;
                        }
                    }
                    const { current_price, open_price, low_price, high_price, change, change_pct } = price;
                    price_store.set(ticker, {
                        current_price : current_price,
                        open_price : open_price,
                        low_price : low_price,
                        high_price : high_price,
                        change : change,
                        change_pct : change_pct
                    });
                } catch (err) {
                    if (err.status === 401 || err.msg_cd === 'EGW00123'){
                        console.error('rest_key expired, refreshing');
                        await refresh_token();
                    } else {
                        console.error('rest_get_price failed for', ticker, '-', err.message);
                    }
                }
                await sleep(request_delay);
            }
        }
    }
    loop();
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

export {
    first_connect,
    add_websocket,
    delete_websocket,
    subscribe_ticker,
    unsubscribe_ticker,
    price_store
};

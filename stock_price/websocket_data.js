const api_key = 'https://openapi.koreainvestment.com:9443';
const domain = 'ws://ops.koreainvestment.com:21000';
const APP_KEY = 'PSpn4hxPrrmFkwJw9AuT1lHZfA4q0IclWylq';
const APP_SECRET = 'Tf6mJafBlISGWKWzJ90pOch7Dj+o4ysiIccBdimUIs6MvbfXzHM8sOoW2hbWCXgzqn6tnx9NRrkyQQE1DLg573+qNkkj/0bUyIfFnVBIH2JPR02evPESr2MNMptDupzWtkvJszxjVUq7/UyWrM7RakCTjo2bown5eWZmTG0HJePihBd1nG4=';
const mysql = require('mysql2');
const WebSocket = require('ws');

DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'your_stock_db_password', // your DB password
    'database': 'your_stock_db', // your DB
    'charset': 'utf8mb4'
}

const pool = mysql.createPool(DB_CONFIG).promise();
const limit = 40;
const price_store = new Map();

async function get_websocket_key(){
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
    return data.approval_key;
}

async function get_rest_key(){
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
    const current_price = data.output.stck_prpr;
    const open_price = data.output.stck_oprc;
    const low_price = data.output.stck_lwpr;
    const high_price = data.output.stck_hgpr;
    return { current_price, open_price, low_price, high_price };
}

function handle_message(websocket, data){
    if (data[0] === '0' || data[0] === '1'){
        const [flag, tr_id, data_count, body] = data.split('|');
        const response = body.split('^');
        const ticker = response[0];
        const current_price = response[2];
        const open_price = response[7];
        const high_price = response[8];
        const low_price = response[9];

        price_store.set(ticker, {
            current_price : current_price,
            open_price : open_price,
            low_price : low_price,
            high_price : high_price
        });
        return;
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

async function first_connect(){
    const websocket_key = await get_websocket_key();
    const websocket = new WebSocket(domain);
    const state = await set_websocket();
    websocket.on('open', () => {
        for (const ticker of state.hot) { websocket.send(websocket_message(websocket_key, ticker, '1')); }
    });

    websocket.on('message', (data) => handle_message(websocket, data.toString()));
    websocket.on('error', (error) => console.error('websocket error:', error));
    websocket.on('close', () => console.log('websocket closed'));

    start_rest(state);

    return { websocket, websocket_key, state };
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
    else { return state; }
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
}

async function start_rest(state){
    const request_delay = 60
    let running  = true;
    let rest_key = await get_rest_key();
    async function loop(){
        while (running){
            const snapshot = [...state.cold];
            for (const ticker of snapshot){
                if (!running) break;
                if (!state.cold.has(ticker)) continue;
                try {
                    const { current_price, open_price, low_price, high_price } = await rest_get_price(rest_key, ticker);
                    price_store.set(ticker, {
                        current_price : current_price,
                        open_price : open_price,
                        low_price : low_price,
                        high_price : high_price
                    });
                } catch (err) {
                    console.error("rest_key expired");
                    rest_key = await get_rest_key();
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

module.exports = {
    first_connect,
    add_websocket,
    delete_websocket,
    price_store
};

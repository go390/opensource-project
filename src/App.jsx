import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Nav from "./components/Nav";
import Home from "./pages/Home";
import Stocks from "./pages/Stocks";
import Watchlist from "./components/Watchlist";
import LoginModal from "./components/LoginModal";
import WatchlistToast from "./components/WatchlistToast";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import StockDetail from "./pages/StockDetail";
import ViewAll from "./pages/ViewAll";

export const authFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};

function App() {

  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });

  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState({});
  const [toast, setToast] = useState(null);

  // Load the live stock list from the backend
  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(d => {
        const withIds = (d.stocks || []).map((s, i) => ({ ...s, id: i + 1 }));
        setStocks(withIds);
      })
      .catch(() => setStocks([]));
  }, []);

  // Load this user's watchlist from the backend whenever stocks/user change
  useEffect(() => {
    if (!user || stocks.length === 0) {
      if (!user) setWatchlist({});
      return;
    }
    authFetch('/api/watchlist')
      .then(r => r.json())
      .then(d => {
        const tickers = new Set(d.watchlist || []);
        const map = {};
        stocks.forEach(s => {
          if (tickers.has(s.symbol)) map[s.id] = true;
        });
        setWatchlist(map);
      })
      .catch(() => {});
  }, [user, stocks]);

  const toggleWatchlist = (id) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const stock = stocks.find((s) => s.id === id);
    const isAdding = !watchlist[id];

    setWatchlist((prev) => ({ ...prev, [id]: !prev[id] }));

    authFetch('/api/watchlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ symbol: stock.symbol }),
    }).catch(() => {});

    if (isAdding) {
      setToast({
        text: "Added to watchlist!",
        stockName: `${stock.name} (${stock.symbol}) added to your watchlist`,
      });
    }
  };

  return (
    <BrowserRouter>
      <Nav
        user={user}
        setUser={setUser}
        setShowLogin={setShowLogin}
        setWatchlist={setWatchlist} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={
          <Stocks
            stocks={stocks}
            watchlist={watchlist}
            onToggle={toggleWatchlist} />
        } />
        <Route path="/stocks/:symbol" element={<StockDetail/>} />
        <Route path="/watchlist" element={
          <Watchlist
            stocks={stocks}
            watchlist={watchlist}
            onToggle={toggleWatchlist} />
        } />
        <Route path="/dashboard" element={<Dashboard stocks={stocks} />} />
        <Route
          path="/dashboard/recommendations/:type"
          element={<ViewAll stocks={stocks} />}
        />
        <Route path="/about" element={<About />} />
      </Routes>

      {showLogin && (
        <LoginModal
          setUser={setUser}
          onClose={() => setShowLogin(false)} />
      )}

      <WatchlistToast message={toast} onDone={() => setToast(null)} />
    </BrowserRouter>
  );
}

export default App;

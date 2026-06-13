import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect} from "react";

import Nav from "./components/Nav";
import Home from "./pages/Home";
import Stocks from "./pages/Stocks";
import Watchlist from "./components/Watchlist";
import LoginModal from "./components/LoginModal";
import WatchlistToast from "./components/WatchlistToast";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import { stocks } from "./data/stocks";

function App() {
  
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });

  const [watchlist, setWatchlist] = useState(() => {
    const savedWatchlist = localStorage.getItem("watchlist");
    if (savedWatchlist) {
      return JSON.parse(savedWatchlist);
    }
    return {};
  });
  
  useEffect(() => {
    localStorage.setItem(
      "watchlist",
      JSON.stringify(watchlist)
    );
  }, [watchlist]);

  const [toast, setToast] = useState(null);

  const toggleWatchlist = (id) => {
    if (!user) {
    setShowLogin(true);
    return;
    }
    const stock = stocks.find((s) => s.id === id);
    const isAdding = !watchlist[id];

    setWatchlist((prev) => ({ ...prev, [id]: !prev[id] }));

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
        setShowLogin={setShowLogin} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={
          <Stocks
            stocks={stocks}
            watchlist={watchlist}
            onToggle={toggleWatchlist} />
        } />
        <Route path="/watchlist" element={
          <Watchlist
            stocks={stocks}
            watchlist={watchlist}
            onToggle={toggleWatchlist} />
        } />
        <Route path="/dashboard" element={<Dashboard />} />
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
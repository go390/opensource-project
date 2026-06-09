import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Nav from "./components/Nav";
import Home from "./pages/Home";
import Stocks from "./pages/Stocks";
import LoginModal from "./components/LoginModal";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";


function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  });
  
  return (
    <BrowserRouter>
      <Nav 
        user={user}
        setUser={setUser}
        setShowLogin={setShowLogin} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
      </Routes>

      {showLogin && (
        <LoginModal 
          setUser={setUser}
          onClose={() => setShowLogin(false)} />
      )}
    </BrowserRouter>
  );
}
export default App;
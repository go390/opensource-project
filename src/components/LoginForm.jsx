import React, { useState } from "react";
import logo from "../assets/logo.webp";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function LoginForm({onClose,setUser}) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setLoading(false);
      onClose();
      navigate("/");
    } catch (err) {
      setError('Connection error. Is the backend running?');
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Server returns a token + user directly on signup — log straight in
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setLoading(false);
      onClose();
      navigate("/");
    } catch (err) {
      setError('Connection error. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[380px] bg-white p-5 sm:p-6 rounded-2xl shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer">
        <X size={20} />
      </button>
       <div className="flex items-center justify-center gap-1 mb-1">
        <img
          src={logo}
          alt="StockSense Logo"
          className="w-16 h-11 rounded-xl object-cover"
        />

        <span className="text-2xl font-bold text-[#081633] tracking-tight">
          StockSense
        </span>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-[18px] sm:text-[24px] font-bold text-gray-900">
          {isLoginMode ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-[13px] text-gray-500 mt-1">
          {isLoginMode ? "Sign in to your account" : "Join StockSense today"}
        </p>
      </div>

      <div className="relative flex h-12 mb-6 border border-gray-300 rounded-full overflow-hidden">
        <button
          className={`w-1/2 text-lg font-medium transition-all z-10 ${
            isLoginMode ? "text-white" : "text-black"
          }`}
          onClick={() => { setIsLoginMode(true); setError(""); }}
        >
          Login
        </button>
        <button
          className={`w-1/2 text-lg font-medium transition-all z-10 ${
            !isLoginMode ? "text-white" : "text-black"
          }`}
          onClick={() => { setIsLoginMode(false); setError(""); }}
        >
          Signup
        </button>
        <div
          className={`absolute top-0 h-full w-1/2 rounded-full bg-gradient-to-r from-green-700 via-cyan-600 to-cyan-200 transition-all ${
            isLoginMode ? "left-0" : "left-1/2"
          }`}
        ></div>
      </div>

      <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="space-y-3">
        {!isLoginMode && (
          <input
            type="text"
            placeholder="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
        />

        {!isLoginMode && (
          <>
            <input
              type="password"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
            />
            {password && password.length < 8 && (
              <p className="text-amber-500 text-sm">
                Password must be at least 8 characters
              </p>
            )}
            {confirmPassword && password.length >= 8 && password !== confirmPassword && (
              <p className="text-red-500 text-sm">
                Passwords do not match
              </p>
            )}
            {confirmPassword && password.length >= 8 && password === confirmPassword && (
              <p className="text-green-500 text-sm">
                Passwords match ✓
              </p>
            )}
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-gradient-to-r from-green-700 via-cyan-600 to-cyan-200 text-white rounded-full text-lg font-medium hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
        >
          {loading
            ? "Please wait..."
            : isLoginMode
              ? "Login"
              : "Signup"}
        </button>

        <p className="text-center text-gray-600">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsLoginMode(!isLoginMode);
              setError("");
            }}
            className="text-cyan-600 hover:underline"
          >
            {isLoginMode ? "Signup now" : "Login"}
          </a>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;

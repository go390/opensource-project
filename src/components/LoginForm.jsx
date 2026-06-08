import React, { useState } from "react";
import logo from "../assets/logo.webp";
import { X } from "lucide-react"

function LoginForm({onClose}) {
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="relative w-full max-w-[380px] bg-white p-5 sm:p-6 rounded-2xl shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
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
          onClick={() => setIsLoginMode(true)}
        >
          Login
        </button>
        <button
          className={`w-1/2 text-lg font-medium transition-all z-10 ${
            !isLoginMode ? "text-white" : "text-black"
          }`}
          onClick={() => setIsLoginMode(false)}
        >
          Signup
        </button>
        <div
          className={`absolute top-0 h-full w-1/2 rounded-full bg-gradient-to-r from-green-700 via-cyan-600 to-cyan-200 transition-all ${
            isLoginMode ? "left-0" : "left-1/2"
          }`}
        ></div>
      </div>

      <form className="space-y-4">
        {!isLoginMode && (
          <input
            type="text"
            placeholder="Name"
            required
            className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          required
          className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
        />
        <input
          type="password"
          placeholder="Password"
          required
          className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
        />

        {!isLoginMode && (
          <input
            type="password"
            placeholder="Confirm Password"
            required
            className="w-full p-3 border-b-2 border-gray-300 outline-none focus:border-cyan-500 placeholder-gray-400"
          />
        )}

      

        <button className="w-full p-3 bg-gradient-to-r from-green-700 via-cyan-600 to-cyan-200 text-white rounded-full text-lg font-medium hover:opacity-90 transition">
          {isLoginMode ? "Login" : "Signup"}
        </button>

        <p className="text-center text-gray-600">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsLoginMode(!isLoginMode);
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
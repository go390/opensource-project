import { useState } from "react";
import { Search, Globe, Menu, X } from "lucide-react";
import logo from "../assets/logo.webp";
import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";
const Nav = ({ setShowLogin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [language, setLanguage] = useState("EN");
  const [langOpen, setLangOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-[1440px] mx-auto h-[62px] px-3 md:px-6 flex items-center justify-between">

          <div className="flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg hover:scale-105 transition-transform cursor-pointer"
            >
              {isOpen ? <X size={26} /> : <Menu size={26} />}
            </button>

            <Link to="/" className="flex items-center">
              <img src={logo} alt="StockSense Logo" className="w-19 h-16 object-contain" />
              <h1 className="hidden sm:block text-[22px] font-bold text-[#0F172A]">StockSense</h1>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 justify-center px-8">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search size={22} />
            </button>

            <div className="hidden lg:flex items-center gap-10">
              <Link to="/stocks" className="text-[16px] font-medium text-slate-700 hover:text-black">Stocks</Link>
              <Link to="/Dashboard" className="text-[16px] font-medium text-slate-700 hover:text-black">AI Dashboard</Link>
              <Link to="/About" className="text-[16px] font-medium text-slate-700 hover:text-black">About Us</Link>
            </div>

            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-2xl hover:bg-gray-50 transition cursor-pointer"
              >
                <Globe size={18} />
                <span className="text-[16px] font-medium text-slate-700">{language}</span>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  <button
                    onClick={() => { setLanguage("EN"); setLangOpen(false); }}
                    className={`w-full text-left px-5 py-4 text-sm hover:bg-gray-100 transition ${language === "EN" ? "bg-gray-100 font-medium" : ""}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setLanguage("KO"); setLangOpen(false); }}
                    className={`w-full text-left px-5 py-4 text-sm hover:bg-gray-100 transition ${language === "KO" ? "bg-gray-100 font-medium" : ""}`}
                  >
                    한국어
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLogin(true)}
              className="bg-[#081633] text-white px-6 py-2 rounded-xl md:rounded-2xl font-semibold hover:bg-[#10224a] transition cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3">
            <SearchBar />
          </div>
        )}

        {isOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-md">
            <div className="flex flex-col p-4 gap-4">
              <Link to="/stocks" onClick={() => setIsOpen(false)} className="font-medium text-slate-700 hover:text-black">Stocks</Link>
              <Link to="/dashboard" onClick={() => setIsOpen(false)} className="font-medium text-slate-700 hover:text-black">AI Dashboard</Link>
              <Link to="/About" onClick={() => setIsOpen(false)} className="font-medium text-slate-700 hover:text-black">About Us</Link>
            </div>
          </div>
        )}
      </nav>

      {langOpen && <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />}
      <div className="h-[62px]" />
    </>
  );
};

export default Nav;
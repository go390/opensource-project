import heroImage from "../assets/hero3.webp"
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative w-full bg-[#0a0d1a] overflow-hidden">

      <img
        src={heroImage}
        alt=""
        className="
          absolute inset-0
          w-full h-full
          object-cover
          object-center
          select-none
          pointer-events-none
        "
      />

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative max-w-screen-xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-[#0b1f17] border border-green-500/25 rounded-full px-5 py-2 mb-10">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span className="text-green-400 text-sm font-medium">Live Market Analysis</span>
        </div>

        <h1 className="font-extrabold leading-[1.05] mb-6" style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)" }}>
          <span className="text-white">Predict Tomorrow's</span>
          <br />
          <span className="text-green-400">Market Today</span>
        </h1>

        <p className="text-gray-400 text-lg max-w-lg mb-10 leading-relaxed">
          AI-powered insights analyzing{" "}
          <span className="text-green-400 font-semibold">12,400+</span>{" "}
          stocks daily with precision and speed
        </p>

        <div className="flex items-center gap-4 mb-20">
          <button onClick={() => navigate("/stocks")}
            className="bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-[14px] rounded-xl text-[15px] transition-colors">
            Explore Stocks &nbsp;→
          </button>
          <button onClick={() => navigate("/Dashboard")} className="bg-[#141b2d] border border-white/10 text-white font-bold px-8 py-[14px] rounded-xl text-[15px] hover:bg-[#1a2340] transition-colors">
            AI Dashboard
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">

          <div className="bg-[#0d1525] border border-white/[0.07] rounded-xl px-6 py-7 text-center">
            <p className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-3">KRX Index</p>
            <p className="text-white font-bold text-2xl mb-1">2,547.32</p>
            <p className="text-green-400 text-sm font-medium">+1.24%</p>
          </div>

          <div className="bg-[#0d1525] border border-white/[0.07] rounded-xl px-6 py-7 text-center">
            <p className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-3">Volume</p>
            <p className="text-white font-bold text-2xl mb-1">847M</p>
            <p className="text-gray-500 text-sm">Today</p>
          </div>

          <div className="bg-[#0d1525] border border-white/[0.07] rounded-xl px-6 py-7 text-center">
            <p className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-3">Winners</p>
            <p className="text-green-400 font-bold text-2xl mb-1">324</p>
            <p className="text-gray-500 text-sm">Stocks</p>
          </div>

          <div className="bg-[#0d1525] border border-white/[0.07] rounded-xl px-6 py-7 text-center">
            <p className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-3">Losers</p>
            <p className="text-red-400 font-bold text-2xl mb-1">178</p>
            <p className="text-gray-500 text-sm">Stocks</p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
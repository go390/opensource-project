import Nav from "../components/Nav";
import Hero from "../components/Hero";
import MajorStocks from "../components/MajorStocks";
import MarketTrend from "../components/MarketTrend";

function Home({ setShowLogin }) {
  return (
    <>
      <Hero />

      <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-stretch">

          <div className="lg:col-span-4">
            <MarketTrend />
          </div>

          <div className="lg:col-span-2">
            <MajorStocks />
          </div>

        </div>
      </section>
    </>
  );
}

export default Home;
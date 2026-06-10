import Nav from "../components/Nav";
import StockList from "../components/StockList";

function Stocks({ stocks, watchlist, onToggle }) {
  return (
    <StockList
      stocks={stocks}
      watchlist={watchlist}
      onToggle={onToggle}
    />
  );
}

export default Stocks;
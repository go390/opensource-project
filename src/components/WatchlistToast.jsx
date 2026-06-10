import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export default function WatchlistToast({ message, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white
        border border-gray-100 rounded-xl shadow-lg px-4 py-3 max-w-xs
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <Star size={18} fill="#22c55e" stroke="#22c55e" className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{message.text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{message.stockName}</p>
      </div>
    </div>
  );
}
import { useState } from "react";

function UserProfile({ user, setUser }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);

    setTimeout(() => {
      localStorage.removeItem("user");
      setUser(null);
      setLoggingOut(false);
    }, 500);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 hover:bg-gray-100 transition"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
          {user.name.charAt(0)}
        </div>
        <span className="hidden md:block text-sm font-medium text-slate-700">
          {user.name}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition">
            Watchlist
          </button>

          <div className="border-t border-gray-100">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-50 transition"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

export default UserProfile;
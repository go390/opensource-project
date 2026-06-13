import { useState } from "react";

function UserProfile({ user, setUser }) {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setUser(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
          {user.name.charAt(0)}
        </div>

        <span className="hidden md:block font-medium">
          {user.name}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
          <button className="w-full px-4 py-3 text-left hover:bg-gray-50">
            My Profile
          </button>

          <button className="w-full px-4 py-3 text-left hover:bg-gray-50">
            Watchlist
          </button>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left text-red-500 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
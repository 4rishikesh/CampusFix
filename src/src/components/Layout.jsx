import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context';
import api from '../api';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearSession } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.get('/notifications?unreadOnly=true')
        .then((res) => setUnreadCount(res.data.unreadCount || 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 border-t-4 border-brand font-sans">
      <header className="px-4 py-3 border-b border-gray-200 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-brand">CampusFix</Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden border border-gray-300 px-3 py-1.5 text-sm font-medium"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <nav id="primary-navigation" className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center gap-3 md:gap-5 absolute md:static top-[61px] left-0 right-0 z-40 bg-white md:bg-transparent border-b md:border-0 border-gray-200 p-4 md:p-0 shadow-md md:shadow-none`}>
          {user ? (
            <>
              <Link to="/public-dashboard" onClick={closeMenu} className="text-sm font-medium hover:underline">Public Dashboard</Link>
              <Link to="/dashboard" onClick={closeMenu} className="text-sm font-medium hover:underline">My Dashboard</Link>
              <Link to="/chats" onClick={closeMenu} className="text-sm font-medium hover:underline">Chats</Link>
              <Link to="/notifications" onClick={closeMenu} className="text-sm font-medium hover:underline flex items-center gap-1.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/report-lost" onClick={closeMenu} className="text-sm font-medium hover:underline">Report Lost</Link>
              <Link to="/report-found" onClick={closeMenu} className="text-sm font-medium hover:underline">Report Found</Link>
              {user.role === 'admin' && <Link to="/admin" onClick={closeMenu} className="text-sm font-medium hover:underline">Administration</Link>}
              <button onClick={handleLogout} className="text-sm font-medium hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className="text-sm font-medium hover:underline">Login</Link>
              <Link to="/register" onClick={closeMenu} className="text-sm font-medium hover:underline">Register</Link>
            </>
          )}
        </nav>
        </div>
      </header>
      <main className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

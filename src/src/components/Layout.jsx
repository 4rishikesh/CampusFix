import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context';
import api from '../api';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearSession } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 border-t-4 border-brand font-sans">
      <header className="p-4 border-b border-gray-200 flex justify-between items-center max-w-6xl mx-auto w-full">
        <Link to="/" className="text-xl font-bold text-brand">CampusFix</Link>
        <nav className="flex items-center space-x-6">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium hover:underline">Dashboard</Link>
              <Link to="/chats" className="text-sm font-medium hover:underline">Chats</Link>
              <Link to="/notifications" className="text-sm font-medium hover:underline flex items-center gap-1.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/report-lost" className="text-sm font-medium hover:underline">Report Lost</Link>
              <Link to="/report-found" className="text-sm font-medium hover:underline">Report Found</Link>
              {user.role === 'admin' && <Link to="/admin" className="text-sm font-medium hover:underline">Administration</Link>}
              <button onClick={handleLogout} className="text-sm font-medium hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:underline">Login</Link>
              <Link to="/register" className="text-sm font-medium hover:underline">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

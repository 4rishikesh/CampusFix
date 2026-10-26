import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function typeBadge(type) {
  switch (type) {
    case 'match_found':
      return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 font-medium rounded">Match Found</span>;
    case 'chat_message':
      return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 font-medium rounded">Message</span>;
    case 'item_status':
      return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 font-medium rounded">Status Update</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 font-medium rounded">Alert</span>;
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { unreadOnly: unreadOnly ? 'true' : undefined } });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Notifications & Alerts</h2>
          <p className="text-sm text-gray-600">System updates, match alerts, and conversation messages</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`text-sm px-3 py-1.5 border ${unreadOnly ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {unreadOnly ? 'Showing Unread' : 'Show Unread Only'}
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-700 text-sm mb-4" role="alert">{error}</div>}

      {loading ? (
        <p className="text-gray-600 py-8 text-center">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center bg-gray-50">
          <p className="text-gray-600">No notifications found.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 bg-white">
          {notifications.map((item) => (
            <li
              key={item._id}
              className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !item.isRead ? 'bg-blue-50/40' : 'hover:bg-gray-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {typeBadge(item.type)}
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                  )}
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-700">{item.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.link && (
                  <Link
                    to={item.link}
                    onClick={() => { if (!item.isRead) markAsRead(item._id); }}
                    className="text-xs bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800 font-medium"
                  >
                    View
                  </Link>
                )}
                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item._id)}
                    className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 hover:bg-gray-100"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteNotification(item._id)}
                  className="text-xs text-red-600 hover:underline px-2 py-1.5"
                  title="Dismiss notification"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

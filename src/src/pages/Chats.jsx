import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/context';

export default function Chats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/chat');
        setChats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load conversations.');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const getOtherParticipant = (participants) => {
    if (!participants || !user) return 'Matched User';
    const other = participants.find((p) => String(p._id || p.id || p) !== String(user.id));
    return other?.name || 'Matched User';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Secure Conversations</h2>
        <p className="text-sm text-gray-600">
          Direct messaging between matched finders and owners to verify ownership before physical item return.
        </p>
      </div>

      {error && <div className="text-red-700 text-sm mb-4" role="alert">{error}</div>}

      {loading ? (
        <p className="text-gray-600 py-8 text-center">Loading conversations...</p>
      ) : chats.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center bg-gray-50">
          <p className="text-gray-700 font-medium mb-1">No active conversations yet.</p>
          <p className="text-sm text-gray-500 mb-4">
            When a potential match is found on your dashboard, you can open a secure chat directly from the match card.
          </p>
          <Link to="/dashboard" className="inline-block bg-slate-900 text-white text-sm px-4 py-2 font-medium">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="border border-gray-200 divide-y divide-gray-200 bg-white">
          {chats.map((chat) => (
            <Link
              key={chat._id}
              to={`/chats/${chat._id}`}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors block"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 font-medium rounded uppercase ${
                      chat.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : chat.status === 'resolved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {chat.status}
                  </span>
                  <span className="font-semibold text-gray-900">
                    With {getOtherParticipant(chat.participants)}
                  </span>
                </div>
                <p className="text-sm text-gray-800">
                  <span className="font-medium text-gray-700">Lost:</span> {chat.lostItem?.title || 'Unknown'} ·{' '}
                  <span className="font-medium text-gray-700">Found:</span> {chat.foundItem?.title || 'Unknown'}
                </p>
                {chat.lastMessage?.content ? (
                  <p className="text-xs text-gray-600 italic">
                    "{chat.lastMessage.content.slice(0, 80)}"
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">No messages yet. Start the conversation!</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-gray-500 block mb-2">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs bg-slate-900 text-white px-3 py-1 font-medium inline-block">
                  Open Chat
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/context';

export default function ChatRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatAndMessages = useCallback(async () => {
    try {
      const [chatRes, msgRes] = await Promise.all([
        api.get(`/chat/${id}`),
        api.get(`/chat/${id}/messages`)
      ]);
      setChat(chatRes.data);
      setMessages(msgRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChatAndMessages();
    // Poll for chat status & new messages every 4 seconds
    const interval = setInterval(() => {
      Promise.all([
        api.get(`/chat/${id}`),
        api.get(`/chat/${id}/messages`)
      ])
        .then(([chatRes, msgRes]) => {
          setChat(chatRes.data);
          setMessages(msgRes.data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchChatAndMessages, id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/chat/${id}/messages`, { content: content.trim() });
      setMessages((prev) => [...prev, res.data]);
      setContent('');
      scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmResolve = async () => {
    setResolving(true);
    try {
      setError('');
      const res = await api.post(`/chat/${id}/resolve`);
      setChat(res.data.chat);
      setShowResolveModal(false);
      setActionNotice('Item successfully resolved! Both reports have been updated and this chat is now closed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve item.');
    } finally {
      setResolving(false);
    }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await api.patch(`/chat/${id}/close`, { reason: closeReason });
      setChat(res.data.chat);
      setShowCloseModal(false);
      setActionNotice('Conversation closed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close conversation.');
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-gray-600">Loading secure chat...</div>;
  }

  if (!chat) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-700 font-medium mb-4">{error || 'Conversation not found.'}</p>
        <Link to="/chats" className="bg-slate-900 text-white px-4 py-2 text-sm font-medium">Back to Conversations</Link>
      </div>
    );
  }

  const isResolved = chat.status === 'resolved' || Boolean(chat.resolvedAt);
  const isClosed = chat.status === 'closed';

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
      {/* Top Header */}
      <div className="border border-gray-200 bg-white p-4 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Link to="/chats" className="text-xs text-gray-600 hover:underline">← Back to Chats</Link>
            <span className="text-gray-300">|</span>
            <span className={`text-xs px-2.5 py-1 font-semibold rounded uppercase ${
              isResolved ? 'bg-blue-100 text-blue-800' :
              isClosed ? 'bg-gray-200 text-gray-700' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {isResolved ? 'RESOLVED & CLOSED' : isClosed ? 'CLOSED' : 'ACTIVE'}
            </span>
          </div>

          {!isClosed && !isResolved && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(true)}
                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 font-medium transition-colors"
              >
                Resolve & Confirm Return
              </button>
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="text-xs border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 font-medium"
              >
                Close Chat
              </button>
            </div>
          )}
        </div>

        {/* Matched Reports Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-sm">
          <div className="flex items-center gap-3">
            {chat.lostItem?.imageUrl && (
              <img src={chat.lostItem.imageUrl} alt="" className="w-10 h-10 object-cover border border-gray-200 shrink-0" />
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Lost Report</p>
              <p className="font-medium text-gray-900">{chat.lostItem?.title || 'Report'}</p>
              <p className="text-xs text-gray-600">{chat.lostItem?.location} · {chat.lostItem?.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {chat.foundItem?.imageUrl && (
              <img src={chat.foundItem.imageUrl} alt="" className="w-10 h-10 object-cover border border-gray-200 shrink-0" />
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Found Report</p>
              <p className="font-medium text-gray-900">{chat.foundItem?.title || 'Report'}</p>
              <p className="text-xs text-gray-600">{chat.foundItem?.location} · {chat.foundItem?.category}</p>
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 mb-2 font-medium">
          {actionNotice}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 mb-2" role="alert">
          {error}
        </div>
      )}

      {/* Safety Notice Banner */}
      {!isClosed && !isResolved && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-3 text-xs text-amber-900 space-y-1">
          <p className="font-bold">Campus Verification & Safety Protocol</p>
          <p>
            1. Ask detailed identifying questions (e.g. wallpapers, unique markings, serial numbers, pouch contents) before meeting.
          </p>
          <p>
            2. Conduct physical handovers exclusively at public campus hubs (e.g. Campus Security Office, Library Help Desk).
          </p>
        </div>
      )}

      {/* Messages Pane */}
      <div className="flex-1 overflow-y-auto border border-gray-200 bg-gray-50 p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No messages yet. Send a message to verify ownership and coordinate handover.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = String(msg.sender?._id || msg.sender) === String(user.id);
            return (
              <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="text-xs text-gray-500 mb-1">
                  {isMe ? 'You' : msg.sender?.name || 'User'} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div
                  className={`max-w-[75%] p-3 text-sm leading-relaxed rounded-lg shadow-xs break-words ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Action Area */}
      {!isClosed && !isResolved ? (
        <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message to verify details..."
            maxLength={2000}
            className="flex-1 border border-gray-300 p-2.5 text-sm bg-white focus:outline-none focus:border-slate-800"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      ) : isResolved ? (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 text-center text-sm text-blue-900 space-y-1">
          <p className="font-bold">✓ Item Verified & Return Confirmed</p>
          <p className="text-xs text-blue-700">Both lost and found reports are now resolved, and this chat has been automatically closed.</p>
          <div className="pt-2">
            <Link to="/dashboard" className="inline-block bg-slate-900 text-white text-xs px-4 py-2 font-medium hover:bg-slate-800">
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 p-3 bg-gray-100 border border-gray-200 text-center text-sm text-gray-600">
          This conversation is closed. {chat.closedReason ? `Reason: ${chat.closedReason}` : ''}
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 max-w-md w-full border border-gray-300 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                ✓
              </span>
              <h3 className="font-bold text-lg text-gray-900">Confirm Return & Resolve</h3>
            </div>
            <p className="text-sm text-gray-700">
              Have you verified ownership and completed the physical handover?
            </p>
            <div className="bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">Confirming will automatically:</p>
              <p>• Mark both the <strong>Lost</strong> and <strong>Found</strong> reports as <strong>Resolved</strong>.</p>
              <p>• Automatically <strong>Close</strong> this chat room.</p>
              <p>• Dismiss active matching alerts and notify both participants.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium hover:bg-gray-50"
                disabled={resolving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={resolving}
                className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Yes, Confirm Return & Close Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 max-w-md w-full border border-gray-300 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Close Conversation</h3>
            <p className="text-sm text-gray-600">
              Provide a reason for closing this conversation (e.g. "Items do not match" or "Owner could not be verified").
            </p>
            <form onSubmit={handleClose} className="space-y-3">
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Reason for closing..."
                rows={3}
                className="w-full border border-gray-300 p-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Confirm Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

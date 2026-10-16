import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Pager({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center gap-3 mt-4 text-sm" aria-label="Pagination">
      <button type="button" onClick={() => onChange(pagination.page - 1)} disabled={pagination.page <= 1} className="border border-gray-300 px-3 py-1 disabled:opacity-50">Previous</button>
      <span>Page {pagination.page} of {pagination.pages}</span>
      <button type="button" onClick={() => onChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="border border-gray-300 px-3 py-1 disabled:opacity-50">Next</button>
    </div>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [blockReasons, setBlockReasons] = useState({});
  const [items, setItems] = useState([]);
  const [itemPagination, setItemPagination] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilter, setItemFilter] = useState({ type: '', status: '', moderation: '' });
  const [itemPage, setItemPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/admin/users', { params: { page: userPage, limit: 10, search: userSearch || undefined, blocked: userFilter || undefined } });
      setUsers(response.data.users);
      setUserPagination(response.data.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [userFilter, userPage, userSearch]);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const response = await api.get('/admin/items', { params: { page: itemPage, limit: 10, search: itemSearch || undefined, type: itemFilter.type || undefined, status: itemFilter.status || undefined, moderation: itemFilter.moderation || undefined } });
      setItems(response.data.items);
      setItemPagination(response.data.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load reports.');
    } finally {
      setLoadingItems(false);
    }
  }, [itemFilter, itemPage, itemSearch]);

  useEffect(() => { void Promise.resolve().then(fetchUsers); }, [fetchUsers]);
  useEffect(() => { void Promise.resolve().then(fetchItems); }, [fetchItems]);

  const changeUsers = (event) => {
    event.preventDefault();
    setUserPage(1);
    fetchUsers();
  };

  const changeItems = (event) => {
    event.preventDefault();
    setItemPage(1);
    fetchItems();
  };

  const blockUser = async (user) => {
    if (!window.confirm(`Block ${user.name}? Their active reports will be held for review.`)) return;
    try {
      setError('');
      const response = await api.patch(`/admin/users/${user.id}/block`, { reason: blockReasons[user.id] || undefined });
      setNotice(`${response.data.user.name} was blocked. ${response.data.heldReports} active report(s) were held for review.`);
      await Promise.all([fetchUsers(), fetchItems()]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to block this user.');
    }
  };

  const unblockUser = async (user) => {
    if (!window.confirm(`Unblock ${user.name}? Held reports will remain unavailable until an administrator releases them.`)) return;
    try {
      setError('');
      const response = await api.patch(`/admin/users/${user.id}/unblock`);
      setNotice(response.data.message);
      await fetchUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to unblock this user.');
    }
  };

  const moderateItem = async (item, action) => {
    const labels = { hold: 'hold for review', release: 'release to normal processing', archive: 'archive' };
    if (!window.confirm(`Are you sure you want to ${labels[action]} “${item.title}”?`)) return;
    try {
      setError('');
      await api.patch(`/admin/items/${item._id}/moderation`, { action });
      setNotice(`Report ${labels[action]}d.`);
      await fetchItems();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to moderate this report.');
    }
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="admin-title">
        <h2 id="admin-title" className="text-2xl font-bold">Administration</h2>
        <p className="mt-2 text-gray-600">Manage campus accounts and review both public and private reports. Blocking immediately revokes API access and holds active reports.</p>
        {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
        {notice && <p className="mt-4 text-green-700" role="status">{notice}</p>}
      </section>

      <section className="border border-gray-200 p-5" aria-labelledby="user-registry-title">
        <h3 id="user-registry-title" className="text-xl font-bold">User registry</h3>
        <form onSubmit={changeUsers} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="user-search">Search users</label>
          <input id="user-search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name or email" className="border border-gray-300 p-2 flex-1" />
          <label className="sr-only" htmlFor="blocked-filter">Block status</label>
          <select id="blocked-filter" value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="border border-gray-300 p-2">
            <option value="">All accounts</option><option value="false">Active accounts</option><option value="true">Blocked accounts</option>
          </select>
          <button type="submit" className="bg-brand text-white px-4 py-2">Search</button>
        </form>
        {loadingUsers ? <p className="mt-5 text-gray-600">Loading users…</p> : users.length === 0 ? <p className="mt-5 text-gray-600">No users match the current filters.</p> : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead><tr className="bg-gray-100"><th className="border p-2">User</th><th className="border p-2">Role</th><th className="border p-2">Status</th><th className="border p-2">Block details</th><th className="border p-2">Action</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id}>
                <td className="border p-2"><p className="font-medium">{user.name}</p><p className="text-gray-600">{user.email}</p></td>
                <td className="border p-2 capitalize">{user.role}</td>
                <td className="border p-2">{user.isBlocked ? 'Blocked' : 'Active'}</td>
                <td className="border p-2">{user.isBlocked ? <><p>{user.blockReason || 'No reason recorded.'}</p><p className="text-gray-600">{formatDate(user.blockedAt)}</p></> : '—'}</td>
                <td className="border p-2">{user.role === 'admin' ? <span className="text-gray-600">Protected admin</span> : user.isBlocked ? <button type="button" onClick={() => unblockUser(user)} className="border border-gray-400 px-3 py-1">Unblock</button> : <div className="space-y-2"><label className="sr-only" htmlFor={`reason-${user.id}`}>Block reason for {user.name}</label><input id={`reason-${user.id}`} value={blockReasons[user.id] || ''} onChange={(event) => setBlockReasons({ ...blockReasons, [user.id]: event.target.value })} placeholder="Optional reason" maxLength="500" className="border border-gray-300 p-1 w-full" /><button type="button" onClick={() => blockUser(user)} className="bg-red-700 text-white px-3 py-1">Block</button></div>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        <Pager pagination={userPagination} onChange={setUserPage} />
      </section>

      <section className="border border-gray-200 p-5" aria-labelledby="report-review-title">
        <h3 id="report-review-title" className="text-xl font-bold">Report review</h3>
        <form onSubmit={changeItems} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="sr-only" htmlFor="report-search">Search reports</label>
          <input id="report-search" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search reports" className="border border-gray-300 p-2 md:col-span-2" />
          <select aria-label="Report type" value={itemFilter.type} onChange={(event) => setItemFilter({ ...itemFilter, type: event.target.value })} className="border border-gray-300 p-2"><option value="">All types</option><option value="lost">Lost</option><option value="found">Found</option></select>
          <select aria-label="Report status" value={itemFilter.status} onChange={(event) => setItemFilter({ ...itemFilter, status: event.target.value })} className="border border-gray-300 p-2"><option value="">All statuses</option><option value="active">Active</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select>
          <select aria-label="Moderation state" value={itemFilter.moderation} onChange={(event) => setItemFilter({ ...itemFilter, moderation: event.target.value })} className="border border-gray-300 p-2"><option value="">All moderation</option><option value="clear">Clear</option><option value="held">Held</option></select>
          <button type="submit" className="bg-brand text-white px-4 py-2 md:col-start-5">Filter reports</button>
        </form>
        {loadingItems ? <p className="mt-5 text-gray-600">Loading reports…</p> : items.length === 0 ? <p className="mt-5 text-gray-600">No reports match the current filters.</p> : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead><tr className="bg-gray-100"><th className="border p-2">Report</th><th className="border p-2">Owner</th><th className="border p-2">Visibility</th><th className="border p-2">State</th><th className="border p-2">Actions</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item._id}>
                <td className="border p-2"><Link to={`/items/${item._id}`} className="font-medium underline">{item.title}</Link><p className="text-gray-600 capitalize">{item.type} · {item.category}</p></td>
                <td className="border p-2">{item.user?.name}<p className="text-gray-600">{item.user?.email}</p></td>
                <td className="border p-2 capitalize">{item.visibility}</td>
                <td className="border p-2 capitalize">{item.status} / {item.moderationState || 'clear'}</td>
                <td className="border p-2"><div className="flex flex-wrap gap-2">{item.status === 'active' && item.moderationState !== 'held' && <button type="button" onClick={() => moderateItem(item, 'hold')} className="border border-gray-400 px-2 py-1">Hold</button>}{item.status === 'active' && item.moderationState === 'held' && <button type="button" onClick={() => moderateItem(item, 'release')} className="border border-gray-400 px-2 py-1">Release</button>}{item.status === 'active' && <button type="button" onClick={() => moderateItem(item, 'archive')} className="border border-red-700 text-red-700 px-2 py-1">Archive</button>}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        <Pager pagination={itemPagination} onChange={setItemPage} />
      </section>
    </div>
  );
}

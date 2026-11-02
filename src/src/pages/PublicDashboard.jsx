import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/context';

export default function PublicDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/items/lost', { params: { search: search.trim() || undefined, limit: 50 } });
        if (active) setItems(response.data.items);
      } catch {
        if (active) setError('Community reports are temporarily unavailable. Please try again shortly.');
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(load, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Community view</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Public Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Only active reports explicitly shared publicly appear here. Found reports stay private for safety.</p>
        </div>
        {user && <Link to="/dashboard" className="text-sm font-medium underline">Go to My Dashboard</Link>}
      </div>
      <label className="block max-w-lg mb-6">
        <span className="sr-only">Search public reports</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by item, category, or location" className="w-full border border-gray-300 p-3 bg-white" />
      </label>
      {error ? <p className="text-red-700" role="alert">{error}</p> : loading ? <p className="text-gray-600 py-8">Loading public reports…</p> : items.length === 0 ? <div className="border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">No public lost reports match your search.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <article key={item._id} className="border border-gray-200 bg-white flex flex-col overflow-hidden">
              {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-44 object-cover" />}
              <div className="p-4 flex flex-col flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Lost · {item.category}</p>
                <h2 className="text-lg font-bold mt-1">{item.title}</h2>
                <p className="text-sm text-gray-600 mt-2">Lost at {item.location} · {item.dateLost ? new Date(item.dateLost).toLocaleDateString() : 'Date not provided'}</p>
                <p className="text-sm text-gray-700 mt-3 line-clamp-3">{item.description}</p>
                <Link to={`/items/${item._id}`} className="mt-4 text-sm font-medium underline">View report</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

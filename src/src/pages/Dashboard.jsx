import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const res = await api.get('/items/my-items');
      setItems(res.data);
      const matchRes = await api.get('/items/my-matches');
      setMatches(matchRes.data);
    } catch (err) {
      setError('Failed to fetch items');
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/items/${id}`);
      fetchItems();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/items/${id}/archive`);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive item');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Items Dashboard</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {matches.length > 0 && (
        <section className="border border-gray-200 p-4 mb-8" aria-labelledby="potential-matches">
          <h3 id="potential-matches" className="text-lg font-bold mb-3">Potential matches</h3>
          <p className="text-sm text-gray-600 mb-3">These are leads, not proof of ownership. Verification will be available with secure communication in a later module.</p>
          <ul className="divide-y divide-gray-200">
            {matches.map((match) => (
              <li key={match.id} className="py-3 flex gap-3 items-center">
                {match.potentialItem.imageUrl && <img src={match.potentialItem.imageUrl} alt="" className="w-12 h-12 object-cover border border-gray-200" />}
                <div><p className="font-medium">{match.ownItem.title} may match {match.potentialItem.title}</p><p className="text-sm text-gray-600">{match.potentialItem.category} · {Math.round(match.score * 100)}% similarity</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      
      {items.length === 0 ? (
        <p className="text-gray-600">You haven't reported any items yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 border border-gray-200 font-semibold">Title</th>
                <th className="p-3 border border-gray-200 font-semibold">Type</th>
                <th className="p-3 border border-gray-200 font-semibold">Status</th>
                <th className="p-3 border border-gray-200 font-semibold">Visibility</th>
                <th className="p-3 border border-gray-200 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="p-3 border border-gray-200">{item.title}</td>
                  <td className="p-3 border border-gray-200 capitalize">{item.type}</td>
                  <td className="p-3 border border-gray-200 capitalize">{item.status}</td>
                  <td className="p-3 border border-gray-200 capitalize">{item.visibility}</td>
                  <td className="p-3 border border-gray-200">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <Link to={`/items/${item._id}`} className="text-slate-800 font-medium hover:underline">View</Link>
                      <Link to={`/items/${item._id}/edit`} className="text-slate-800 font-medium hover:underline">Edit</Link>
                      {item.status === 'active' && <button onClick={() => handleArchive(item._id)} className="text-slate-800 font-medium hover:underline">Archive</button>}
                      <button onClick={() => handleDelete(item._id)} className="text-red-600 font-medium hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

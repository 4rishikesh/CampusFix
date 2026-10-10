import { useState, useEffect } from 'react';
import api from '../api';

export default function Home() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicItems = async () => {
      try {
        const res = await api.get('/items/lost');
        setItems(res.data.items);
      } catch (err) {
        setError('Community reports are temporarily unavailable. Please try again shortly.');
      }
    };
    fetchPublicItems();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Community Lost & Found</h2>
      <p className="text-gray-600 mb-8">Browse publicly listed lost items. Found items are kept private for security.</p>

      {error ? <p className="text-red-700" role="alert">{error}</p> : items.length === 0 ? (
        <p className="text-gray-500">No public lost items reported at this time.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(item => (
            <div key={item._id} className="border border-gray-200 p-4 hover:border-gray-300">
              <h3 className="text-xl font-bold mb-1">{item.title}</h3>
              <div className="text-sm text-gray-500 mb-2">
                <span className="font-semibold text-gray-700">{item.category}</span> • Lost at {item.location} • {new Date(item.dateLost).toLocaleDateString()}
              </div>
              <p className="text-gray-700 mt-3">{item.description}</p>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.title} className="mt-4 w-full h-48 object-cover border border-gray-200" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

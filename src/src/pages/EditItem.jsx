import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/items/${id}`).then((response) => setItem(response.data)).catch((err) => setError(err.response?.data?.message || 'Unable to load this report.'));
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const payload = new FormData();
      ['title', 'category', 'location', 'description'].forEach((key) => payload.append(key, item[key]));
      payload.append(item.type === 'lost' ? 'dateLost' : 'dateFound', item.type === 'lost' ? item.dateLost.slice(0, 10) : item.dateFound.slice(0, 10));
      if (item.type === 'lost') payload.append('visibility', item.visibility);
      if (image) payload.append('image', image);
      await api.put(`/items/${id}`, payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update this report.');
    }
  };

  if (error && !item) return <p className="text-red-700" role="alert">{error}</p>;
  if (!item) return <p className="text-gray-600">Loading report…</p>;
  const dateField = item.type === 'lost' ? 'dateLost' : 'dateFound';

  return (
    <div className="max-w-2xl mx-auto border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-2">Edit {item.type === 'lost' ? 'Lost' : 'Found'} Report</h2>
      {item.type === 'found' && <p className="text-sm text-gray-600 mb-6">Found reports remain private to prevent fraudulent claims.</p>}
      <form onSubmit={submit} className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} className="w-full border border-gray-300 p-2" required /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Category</label><input value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })} className="w-full border border-gray-300 p-2" required /></div>
          <div><label className="block text-sm font-medium mb-1">Location {item.type === 'lost' ? 'Lost' : 'Found'}</label><input value={item.location} onChange={(e) => setItem({ ...item, location: e.target.value })} className="w-full border border-gray-300 p-2" required /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Date {item.type === 'lost' ? 'Lost' : 'Found'}</label><input type="date" value={item[dateField]?.slice(0, 10) || ''} onChange={(e) => setItem({ ...item, [dateField]: e.target.value })} className="w-full border border-gray-300 p-2" required /></div>
          {item.type === 'lost' && <div><label className="block text-sm font-medium mb-1">Visibility</label><select value={item.visibility} onChange={(e) => setItem({ ...item, visibility: e.target.value })} className="w-full border border-gray-300 p-2"><option value="public">Public</option><option value="private">Private</option></select></div>}
        </div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea rows="4" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} className="w-full border border-gray-300 p-2" required /></div>
        <div><label className="block text-sm font-medium mb-1">Replace image (optional, JPEG, PNG, or WebP; 5 MB max)</label><input type="file" accept="image/jpeg,image/png,image/webp" className="w-full border border-gray-300 p-2" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>
        {error && <p className="text-red-700 text-sm" role="alert">{error}</p>}
        <button type="submit" className="bg-brand text-white px-6 py-2 font-medium">Save Changes</button>
      </form>
    </div>
  );
}

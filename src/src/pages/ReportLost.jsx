import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ReportLost() {
  const [formData, setFormData] = useState({
    title: '', category: '', location: '', dateLost: '', description: '', visibility: 'public'
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      if (image) payload.append('image', image);
      await api.post('/items/lost', payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report lost item.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6">Report Lost Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input name="title" type="text" className="w-full border border-gray-300 p-2" onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input name="category" type="text" className="w-full border border-gray-300 p-2" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location Lost</label>
            <input name="location" type="text" className="w-full border border-gray-300 p-2" onChange={handleChange} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date Lost</label>
            <input name="dateLost" type="date" className="w-full border border-gray-300 p-2" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Visibility</label>
            <select name="visibility" className="w-full border border-gray-300 p-2" onChange={handleChange}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" rows="4" className="w-full border border-gray-300 p-2" onChange={handleChange} required></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Image (optional, JPEG, PNG, or WebP; 5 MB max)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="w-full border border-gray-300 p-2" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        </div>
        {error && <p className="text-red-700 text-sm" role="alert">{error}</p>}
        <button type="submit" className="bg-brand text-white px-6 py-2 font-medium">Submit Report</button>
      </form>
    </div>
  );
}

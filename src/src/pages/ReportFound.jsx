import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ReportFound() {
  const [formData, setFormData] = useState({
    title: '', category: '', location: '', dateFound: '', description: ''
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
      await api.post('/items/found', payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report found item.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto border border-gray-200 p-6 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">Report Found Item</h2>
      <p className="text-sm text-gray-600 mb-6 border-l-4 border-brand pl-3 py-1">
        Found items are kept strictly private to prevent fraudulent claims. 
        They will be analyzed internally for potential matches.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input name="title" type="text" className="w-full border border-gray-300 p-2 bg-white" onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input name="category" type="text" className="w-full border border-gray-300 p-2 bg-white" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location Found</label>
            <input name="location" type="text" className="w-full border border-gray-300 p-2 bg-white" onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date Found</label>
          <input name="dateFound" type="date" className="w-full border border-gray-300 p-2 bg-white" onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (Be Specific!)</label>
          <textarea name="description" rows="4" className="w-full border border-gray-300 p-2 bg-white" onChange={handleChange} required></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Image (optional, JPEG, PNG, or WebP; 5 MB max)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="w-full border border-gray-300 p-2 bg-white" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        </div>
        {error && <p className="text-red-700 text-sm" role="alert">{error}</p>}
        <button type="submit" className="bg-brand text-white px-6 py-2 font-medium">Securely Report Found Item</button>
      </form>
    </div>
  );
}

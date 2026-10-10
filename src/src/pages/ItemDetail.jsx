import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

export default function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/items/${id}`).then((response) => setItem(response.data)).catch((err) => setError(err.response?.data?.message || 'Unable to load this report.'));
  }, [id]);

  if (error) return <p className="text-red-700" role="alert">{error}</p>;
  if (!item) return <p className="text-gray-600">Loading report…</p>;
  const reportDate = item.type === 'lost' ? item.dateLost : item.dateFound;
  return (
    <article className="max-w-2xl mx-auto border border-gray-200 p-6">
      <p className="text-sm text-gray-600 mb-2 capitalize">{item.type} report · {item.status}</p>
      <h2 className="text-2xl font-bold mb-3">{item.title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5"><div><dt className="font-medium">Category</dt><dd>{item.category}</dd></div><div><dt className="font-medium">Location</dt><dd>{item.location}</dd></div><div><dt className="font-medium">Date</dt><dd>{reportDate ? new Date(reportDate).toLocaleDateString() : 'Not provided'}</dd></div><div><dt className="font-medium">Visibility</dt><dd className="capitalize">{item.visibility}</dd></div></dl>
      <p className="whitespace-pre-wrap">{item.description}</p>
      {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="mt-5 w-full max-h-96 object-contain border border-gray-200" />}
      <Link to="/dashboard" className="inline-block mt-6 text-sm font-medium underline">Back to dashboard</Link>
    </article>
  );
}

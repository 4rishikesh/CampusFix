import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/context';

const NITW_EMAIL_MESSAGE = 'Please register using a valid @student.nitw.ac.in or @nitw.ac.in email address.';

function isAllowedNitwEmail(value) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(student\.nitw\.ac\.in|nitw\.ac\.in)$/.test(value.trim().toLowerCase());
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { startSession } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAllowedNitwEmail(email)) {
      setError(NITW_EMAIL_MESSAGE);
      return;
    }
    try {
      setError('');
      const res = await api.post('/auth/register', { name, email: email.trim().toLowerCase(), password });
      startSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-2">Register</h2>
      <p className="mb-6 text-sm text-gray-600">CampusFix registration requires an NITW email: students use <span className="font-medium">name@student.nitw.ac.in</span>; faculty and staff use <span className="font-medium">name@nitw.ac.in</span>.</p>
      {error && <div className="mb-4 text-red-600 text-sm font-medium" role="alert">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="register-name" className="block text-sm font-medium mb-1">Full Name</label>
          <input 
            id="register-name"
            type="text" 
            className="w-full border border-gray-300 p-2" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium mb-1">NITW Email</label>
          <input 
            id="register-email"
            type="email" 
            className="w-full border border-gray-300 p-2" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@student.nitw.ac.in"
            aria-describedby="nitw-email-help"
            required
          />
          <p id="nitw-email-help" className="mt-1 text-sm text-gray-600">Only @student.nitw.ac.in and @nitw.ac.in addresses can register.</p>
        </div>
        <div>
          <label htmlFor="register-password" className="block text-sm font-medium mb-1">Password</label>
          <input 
            id="register-password"
            type="password" 
            className="w-full border border-gray-300 p-2" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="w-full bg-brand text-white py-2 font-medium">Register</button>
      </form>
    </div>
  );
}

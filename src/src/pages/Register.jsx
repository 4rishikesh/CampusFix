import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/context';

const EMAIL_ERROR_MESSAGE = 'Please enter a valid email address.';

function isAllowedEmail(value) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value.trim().toLowerCase());
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
    if (!isAllowedEmail(email)) {
      setError(EMAIL_ERROR_MESSAGE);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      setError('');
      const res = await api.post('/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password });
      startSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many registration attempts. Please wait a few moments before trying again.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please check your information and try again.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 border border-gray-200 p-6 bg-white">
      <h2 className="text-2xl font-bold mb-2">Register</h2>
      <p className="mb-6 text-sm text-gray-600">Create an account to report lost or found items and connect with finders.</p>
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
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium mb-1">Email Address</label>
          <input 
            id="register-email"
            type="email" 
            className="w-full border border-gray-300 p-2" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@student.nitw.ac.in or name@example.com"
            aria-describedby="email-help"
            required
          />
          <p id="email-help" className="mt-1 text-xs text-gray-500">Supports campus (@nitw.ac.in, @student.nitw.ac.in) and standard emails.</p>
        </div>
        <div>
          <label htmlFor="register-password" className="block text-sm font-medium mb-1">Password</label>
          <input 
            id="register-password"
            type="password" 
            className="w-full border border-gray-300 p-2" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <button type="submit" className="w-full bg-brand text-white py-2 font-medium hover:opacity-90">Register</button>
      </form>
    </div>
  );
}

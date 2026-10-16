import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { AuthContext } from './context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  const clearSession = useCallback((message = '') => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthMessage(message);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
      setAuthMessage('');
    } catch (error) {
      clearSession(error.response?.data?.code === 'ACCOUNT_BLOCKED' ? 'Your account has been blocked. Contact a campus administrator for help.' : 'Please sign in to continue.');
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void Promise.resolve().then(refreshSession);
  }, [refreshSession]);

  useEffect(() => {
    const handleBlocked = () => clearSession('Your account has been blocked. Contact a campus administrator for help.');
    window.addEventListener('campusfix:blocked', handleBlocked);
    return () => window.removeEventListener('campusfix:blocked', handleBlocked);
  }, [clearSession]);

  const startSession = useCallback((token, profile) => {
    localStorage.setItem('token', token);
    setUser(profile);
    setAuthMessage('');
  }, []);

  return <AuthContext.Provider value={{ user, loading, authMessage, startSession, clearSession, refreshSession }}>{children}</AuthContext.Provider>;
}

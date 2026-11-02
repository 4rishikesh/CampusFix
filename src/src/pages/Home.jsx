import { Link } from 'react-router-dom';
import { useAuth } from '../auth/context';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl py-8 sm:py-14">
      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Campus lost & found</p>
      <h1 className="text-3xl sm:text-4xl font-bold mb-4">Find what matters, safely.</h1>
      <p className="text-gray-600 text-lg mb-8">{user ? 'Browse approved community reports, or manage your own reports, matches, and secure conversations.' : 'Sign in to access campus reports, manage your items, and use secure conversations.'}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {user ? (
          <>
            <Link to="/public-dashboard" className="text-center bg-slate-900 text-white px-5 py-3 font-medium hover:bg-slate-800">Browse Public Dashboard</Link>
            <Link to="/dashboard" className="text-center border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50">Open My Dashboard</Link>
          </>
        ) : (
          <>
            <Link to="/login" className="text-center bg-slate-900 text-white px-5 py-3 font-medium hover:bg-slate-800">Sign In</Link>
            <Link to="/register" className="text-center border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50">Create Account</Link>
          </>
        )}
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportLost from './pages/ReportLost';
import ReportFound from './pages/ReportFound';
import EditItem from './pages/EditItem';
import ItemDetail from './pages/ItemDetail';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';
import Chats from './pages/Chats';
import ChatRoom from './pages/ChatRoom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/context';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-gray-600">Checking your session…</p>;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-gray-600">Checking your session…</p>;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="chats" element={<PrivateRoute><Chats /></PrivateRoute>} />
            <Route path="chats/:id" element={<PrivateRoute><ChatRoom /></PrivateRoute>} />
            <Route path="report-lost" element={<PrivateRoute><ReportLost /></PrivateRoute>} />
            <Route path="report-found" element={<PrivateRoute><ReportFound /></PrivateRoute>} />
            <Route path="items/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
            <Route path="items/:id/edit" element={<PrivateRoute><EditItem /></PrivateRoute>} />
            <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

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

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="report-lost" element={
            <PrivateRoute><ReportLost /></PrivateRoute>
          } />
          <Route path="report-found" element={
            <PrivateRoute><ReportFound /></PrivateRoute>
          } />
          <Route path="items/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
          <Route path="items/:id/edit" element={<PrivateRoute><EditItem /></PrivateRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

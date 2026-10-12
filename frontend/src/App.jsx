import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assets from './pages/Assets.jsx';
import Masters from './pages/Masters.jsx';
import Mutations from './pages/Mutations.jsx';
import Users from './pages/Users.jsx';
import Reports from './pages/Reports.jsx';

function Shell({ children }) {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const logout = () => { localStorage.clear(); nav('/login'); };
  const unitLabel = user?.unit_name ? ` - ${user.unit_name}` : (user?.role === 'admin' ? ' - Semua Unit' : '');
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>SI Aset Al-Irsyad</h2>
        <small>{user?.name} ({user?.role}{unitLabel})</small>
        <div style={{height:12}} />
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/aset">Data Aset</NavLink>
        <NavLink to="/mutasi">Mutasi & Servis</NavLink>
        <NavLink to="/laporan">Laporan</NavLink>
        <NavLink to="/master">Master Data</NavLink>
        {user?.role === 'admin' && <NavLink to="/users">Users</NavLink>}
        <div style={{flex:1}} />
        <button className="secondary" onClick={logout}>Logout</button>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

function Guard({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/aset" element={<Guard><Assets /></Guard>} />
      <Route path="/mutasi" element={<Guard><Mutations /></Guard>} />
      <Route path="/laporan" element={<Guard><Reports /></Guard>} />
      <Route path="/master" element={<Guard><Masters /></Guard>} />
      <Route path="/users" element={<Guard><Users /></Guard>} />
    </Routes>
  );
}

import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const logout = () => { localStorage.clear(); nav('/login'); };
  const unitLabel = user?.unit_name ? ` - ${user.unit_name}` : (user?.role === 'admin' ? ' - Semua Unit' : '');
  const close = () => setOpen(false);
  return (
    <>
    <div className="mobilebar">
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Buka menu">☰</button>
      <strong>SI Aset Al-Irsyad</strong>
    </div>
    <div className="layout">
      {open && <button className="scrim" onClick={close} aria-label="Tutup menu" />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <h2>SI Aset Al-Irsyad</h2>
        <small>{user?.name} ({user?.role}{unitLabel})</small>
        <div style={{height:12}} />
        <nav onClick={close}>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/aset">Data Aset</NavLink>
        <NavLink to="/mutasi">Mutasi & Servis</NavLink>
        <NavLink to="/laporan">Laporan</NavLink>
        <NavLink to="/master">Master Data</NavLink>
        {user?.role === 'admin' && <NavLink to="/users">Users</NavLink>}
        </nav>
        <button className="secondary logout-btn" onClick={logout}>Logout</button>
      </aside>
      <div className="main">{children}</div>
    </div>
    </>
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

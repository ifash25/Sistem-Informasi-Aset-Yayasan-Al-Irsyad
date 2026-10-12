import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import Icon from './components/Icon.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assets from './pages/Assets.jsx';
import Masters from './pages/Masters.jsx';
import Mutations from './pages/Mutations.jsx';
import Users from './pages/Users.jsx';
import Reports from './pages/Reports.jsx';
import Disposals from './pages/Disposals.jsx';
import Labels from './pages/Labels.jsx';
import Scan from './pages/Scan.jsx';
import Procurements from './pages/Procurements.jsx';

function Shell({ children }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const logout = () => { localStorage.clear(); nav('/login'); };
  const unitLabel = user?.unit_name ? user.unit_name : (user?.role === 'admin' ? 'Semua Unit' : '');
  const roleLabel = { admin: 'Administrator', operator: 'Operator', viewer: 'Viewer' }[user?.role] || user?.role;
  const close = () => setOpen(false);
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();
  const menu = [
    { to: '/', end: true, icon: 'dashboard', label: 'Dashboard' },
    { to: '/aset', icon: 'box', label: 'Data Aset' },
    { to: '/mutasi', icon: 'swap', label: 'Mutasi & Servis' },
    { to: '/hapus', icon: 'trash', label: 'Penghapusan' },
    { to: '/pengadaan', icon: 'cart', label: 'Pengadaan' },
    { to: '/label', icon: 'qr', label: 'Label QR' },
    { to: '/scan', icon: 'scan', label: 'Scan QR' },
    { to: '/laporan', icon: 'file', label: 'Laporan' },
    { to: '/master', icon: 'database', label: 'Master Data' },
    ...(user?.role === 'admin' ? [{ to: '/users', icon: 'users', label: 'Users' }] : []),
  ];
  return (
    <>
    <div className="mobilebar">
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Buka menu"><Icon name="menu" size={20} /></button>
      <strong>SI Aset Al-Irsyad</strong>
    </div>
    <div className="layout">
      {open && <button className="scrim" onClick={close} aria-label="Tutup menu" />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <span className="brand-badge"><Icon name="building" size={20} /></span>
          <div>
            <h2>SI Aset Al-Irsyad</h2>
            <small>Yayasan Al-Irsyad</small>
          </div>
        </div>
        <div className="user-chip">
          <span className="avatar">{initial}</span>
          <div className="user-info">
            <strong>{user?.name}</strong>
            <small>{roleLabel}{unitLabel ? ` • ${unitLabel}` : ''}</small>
          </div>
        </div>
        <nav onClick={close}>
          {menu.map(m => (
            <NavLink key={m.to} to={m.to} end={m.end}>
              <Icon name={m.icon} size={17} />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="secondary logout-btn" onClick={logout}>
          <Icon name="logout" size={16} /> Logout
        </button>
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
      <Route path="/hapus" element={<Guard><Disposals /></Guard>} />
      <Route path="/pengadaan" element={<Guard><Procurements /></Guard>} />
      <Route path="/label" element={<Guard><Labels /></Guard>} />
      <Route path="/scan" element={<Guard><Scan /></Guard>} />
      <Route path="/laporan" element={<Guard><Reports /></Guard>} />
      <Route path="/master" element={<Guard><Masters /></Guard>} />
      <Route path="/users" element={<Guard><Users /></Guard>} />
    </Routes>
  );
}

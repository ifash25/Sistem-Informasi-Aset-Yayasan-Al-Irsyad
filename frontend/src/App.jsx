import { useEffect, useRef, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import Icon from './components/Icon.jsx';
import api from './api.js';
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
import StockOpname from './pages/StockOpname.jsx';
import Audit from './pages/Audit.jsx';

function NotifBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef(null);
  const load = async () => {
    try {
      const { data } = await api.get('/notifications?limit=15');
      setItems(data.rows);
      setUnread(data.unread);
    } catch (e) { /* token expired dll, abaikan */ }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const click = async (n) => {
    setOpen(false);
    if (!n.is_read) { await api.put(`/notifications/${n.id}/read`).catch(() => {}); load(); }
    if (n.link) nav(n.link);
  };
  const readAll = async () => {
    await api.put('/notifications/read-all/all').catch(() => {});
    load();
  };
  return (
    <div className="notif" ref={boxRef}>
      <button className="notif-btn" onClick={() => setOpen(!open)} aria-label="Notifikasi">
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifikasi</strong>
            {unread > 0 && <button className="secondary" onClick={readAll}>Tandai semua</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="notif-empty">Belum ada notifikasi</p>}
            {items.map(n => (
              <button key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => click(n)}>
                <strong>{n.title}</strong>
                <span>{n.message}</span>
                <small>{new Date(n.created_at).toLocaleString('id-ID')}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    { to: '/opname', icon: 'clipboard', label: 'Stock Opname' },
    { to: '/label', icon: 'qr', label: 'Label QR' },
    { to: '/scan', icon: 'scan', label: 'Scan QR' },
    { to: '/laporan', icon: 'file', label: 'Laporan' },
    { to: '/master', icon: 'database', label: 'Master Data' },
    ...(user?.role === 'admin' ? [
      { to: '/audit', icon: 'history', label: 'Audit Trail' },
      { to: '/users', icon: 'users', label: 'Users' },
    ] : []),
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
          <NotifBell />
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
      <Route path="/opname" element={<Guard><StockOpname /></Guard>} />
      <Route path="/label" element={<Guard><Labels /></Guard>} />
      <Route path="/scan" element={<Guard><Scan /></Guard>} />
      <Route path="/laporan" element={<Guard><Reports /></Guard>} />
      <Route path="/master" element={<Guard><Masters /></Guard>} />
      <Route path="/audit" element={<Guard><Audit /></Guard>} />
      <Route path="/users" element={<Guard><Users /></Guard>} />
    </Routes>
  );
}

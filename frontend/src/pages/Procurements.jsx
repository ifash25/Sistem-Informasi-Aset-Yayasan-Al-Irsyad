import { useEffect, useState } from 'react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const statusColor = (s) => ({ draft: '#64748b', diajukan: '#d97706', disetujui: '#16a34a', ditolak: '#dc2626', selesai: '#2563eb' }[s] || '#64748b');

export default function Procurements() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = me?.role === 'admin';
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ unit_id: '', title: '', plan_year: new Date().getFullYear() });
  const [sel, setSel] = useState(null);
  const [item, setItem] = useState({ name: '', category_id: '', qty: 1, unit_price: 0, vendor: '', notes: '' });
  const [recv, setRecv] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [a, u, c] = await Promise.all([api.get('/procurements'), api.get('/master/units'), api.get('/master/categories')]);
      setRows(a.data); setUnits(u.data); setCats(c.data);
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat'); }
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    setErr('');
    try { const { data } = await api.get('/procurements/' + id); setSel(data); }
    catch (e) { setErr(e.response?.data?.message || 'Gagal memuat detail'); }
  };

  const create = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/procurements', f);
      setF({ unit_id: '', title: '', plan_year: new Date().getFullYear() });
      alert(data.message); load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal'); }
  };

  const act = async (msg, fn) => {
    if (!confirm(msg)) return;
    try { const { data } = await fn(); alert(data.message); load(); if (sel) openDetail(sel.id); }
    catch (e) { setErr(e.response?.data?.message || 'Gagal'); }
  };

  const addItem = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post(`/procurements/${sel.id}/items`, item);
      setItem({ name: '', category_id: '', qty: 1, unit_price: 0, vendor: '', notes: '' });
      openDetail(sel.id); load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal'); }
  };

  const doReceive = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.put(`/procurements/items/${recv.item_id}/receive`, recv);
      alert(data.message + (data.asset_code ? ' — kode aset: ' + data.asset_code : ''));
      setRecv(null); openDetail(sel.id); load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal'); }
  };

  if (sel) {
    const canReceive = sel.status === 'disetujui' && me?.role !== 'viewer';
    return (
      <>
        <div className="topbar">
          <h2><Icon name="file" /> {sel.title} — {sel.plan_year}</h2>
          <div className="topbar-actions">
            <button className="secondary" onClick={() => { setSel(null); load(); }}>Kembali</button>
            <button className="secondary" onClick={() => window.print()}><Icon name="print" size={15} /> Cetak</button>
          </div>
        </div>
        {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
        <div className="card">
          <dl className="kv">
            <dt>Unit</dt><dd>{sel.unit_code} — {sel.unit_name}</dd>
            <dt>Status</dt><dd><span className="badge" style={{ color: statusColor(sel.status) }}>{sel.status}</span></dd>
            <dt>Total Rencana</dt><dd>{rp(sel.total_plan)}</dd>
            <dt>Total Realisasi</dt><dd>{rp(sel.total_real)}</dd>
          </dl>
          <div className="actions" style={{ marginTop: 8 }}>
            {sel.status === 'draft' && (
              <button onClick={() => act('Ajukan rencana ke admin?', () => api.put(`/procurements/${sel.id}/submit`))}>Ajukan</button>
            )}
            {sel.status === 'diajukan' && isAdmin && (
              <>
                <button onClick={() => act('Setujui rencana?', () => api.put(`/procurements/${sel.id}/approve`))}>Setujui</button>
                <button className="danger" onClick={() => act('Tolak rencana?', () => api.put(`/procurements/${sel.id}/reject`))}>Tolak</button>
              </>
            )}
            {(sel.status === 'diajukan' || sel.status === 'ditolak') && (
              <button className="secondary" onClick={() => act('Kembalikan ke draft?', () => api.put(`/procurements/${sel.id}/back`))}>Kembali ke Draft</button>
            )}
            {(sel.status === 'draft' || sel.status === 'ditolak') && (
              <button className="danger" onClick={() => act('Hapus rencana ini?', () => api.delete(`/procurements/${sel.id}`))}>Hapus</button>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Item Rencana</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Kategori</th><th>Qty</th><th>Harga Rencana</th><th>Subtotal</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>{(sel.items || []).map(i => (
                <tr key={i.id}>
                  <td>{i.name}<br /><small>{i.vendor || ''}</small></td>
                  <td>{i.category_name || '-'}</td>
                  <td>{i.received ? (i.real_qty || i.qty) : i.qty}</td>
                  <td>{rp(i.unit_price)}</td>
                  <td>{rp(i.received ? (i.real_qty || i.qty) * (i.real_price || i.unit_price) : i.qty * i.unit_price)}</td>
                  <td>{i.received
                    ? <span style={{ color: '#16a34a' }}>✓ {i.asset_code}</span>
                    : <span style={{ color: '#d97706' }}>pending</span>}</td>
                  <td className="actions">
                    {canReceive && !i.received && (
                      <button onClick={() => setRecv({ item_id: i.id, real_price: i.unit_price, real_qty: i.qty, vendor: i.vendor || '', brand: '', serial_number: '', purchase_year: new Date().getFullYear(), notes: '' })}>Terima</button>
                    )}
                    {sel.status === 'draft' && !i.received && (
                      <button className="danger" onClick={() => act('Hapus item?', async () => api.delete(`/procurements/items/${i.id}`))}>Hapus</button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {sel.status === 'draft' && (
          <div className="card">
            <h3>Tambah Item</h3>
            <form onSubmit={addItem}>
              <div className="form-grid">
                <input required placeholder="Nama barang (ex: Laptop ASUS)" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} />
                <select value={item.category_id} onChange={e => setItem({ ...item, category_id: e.target.value })}>
                  <option value="">- Kategori -</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" min="1" required value={item.qty} onChange={e => setItem({ ...item, qty: e.target.value })} />
                <input type="number" min="0" step="1000" placeholder="Harga satuan (Rp)" value={item.unit_price} onChange={e => setItem({ ...item, unit_price: e.target.value })} />
                <input placeholder="Vendor / toko" value={item.vendor} onChange={e => setItem({ ...item, vendor: e.target.value })} />
              </div>
              <div style={{ marginTop: 8 }}><button><Icon name="plus" size={15} /> Tambah Item</button></div>
            </form>
          </div>
        )}

        {recv && (
          <div className="card">
            <h3>Terima Barang — Buat Aset</h3>
            <form onSubmit={doReceive}>
              <div className="form-grid">
                <input type="number" min="0" step="1000" placeholder="Harga realisasi (Rp)" value={recv.real_price} onChange={e => setRecv({ ...recv, real_price: e.target.value })} />
                <input type="number" min="1" value={recv.real_qty} onChange={e => setRecv({ ...recv, real_qty: e.target.value })} />
                <input placeholder="Vendor" value={recv.vendor} onChange={e => setRecv({ ...recv, vendor: e.target.value })} />
                <input placeholder="Merk" value={recv.brand} onChange={e => setRecv({ ...recv, brand: e.target.value })} />
                <input placeholder="No. Serial" value={recv.serial_number} onChange={e => setRecv({ ...recv, serial_number: e.target.value })} />
                <input type="number" placeholder="Tahun beli" value={recv.purchase_year} onChange={e => setRecv({ ...recv, purchase_year: e.target.value })} />
              </div>
              <input style={{ width: '100%', marginTop: 8 }} placeholder="Catatan" value={recv.notes} onChange={e => setRecv({ ...recv, notes: e.target.value })} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button>Simpan &amp; Buat Aset</button>
                <button type="button" className="secondary" onClick={() => setRecv(null)}>Batal</button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="topbar"><h2><Icon name="cart" /> Pengadaan Aset{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card">
        <h3><Icon name="cart" /> Buat Rencana Pengadaan</h3>
        <form onSubmit={create}>
          <div className="form-grid">
            {!isScoped && (
              <select required value={f.unit_id} onChange={e => setF({ ...f, unit_id: e.target.value })}>
                <option value="">- Pilih Unit -</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
              </select>
            )}
            <input required placeholder="Judul (ex: Pengadaan Laptop Lab 2026)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
            <input type="number" required min="2020" max="2100" value={f.plan_year} onChange={e => setF({ ...f, plan_year: e.target.value })} />
          </div>
          <div style={{ marginTop: 8 }}><button>Buat</button></div>
        </form>
        {!isAdmin && <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>Rencana diajukan → menunggu persetujuan admin → terima barang → aset otomatis terdaftar.</p>}
      </div>
      <div className="card">
        <h3>Daftar Rencana</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tahun</th><th>Judul</th><th>Unit</th><th>Item</th><th>Total Rencana</th><th>Total Realisasi</th><th>Status</th><th></th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.id}>
              <td>{r.plan_year}</td><td>{r.title}</td><td>{r.unit_code}</td>
              <td>{r.received_count}/{r.item_count}</td>
              <td>{rp(r.total_plan)}</td><td>{rp(r.total_real)}</td>
              <td><span className="badge" style={{ color: statusColor(r.status) }}>{r.status}</span></td>
              <td><button className="secondary" onClick={() => openDetail(r.id)}>Detail</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}


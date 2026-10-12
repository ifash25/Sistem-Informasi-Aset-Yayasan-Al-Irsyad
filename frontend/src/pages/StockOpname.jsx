import { useEffect, useState } from 'react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function StockOpname() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const canWrite = me?.role !== 'viewer';
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ unit_id: me?.unit_id || '', title: '', opname_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [item, setItem] = useState({ asset_code: '', result: 'ada', notes: '' });

  const load = async () => {
    const { data } = await api.get('/stockopname');
    setRows(data);
  };
  const open = async (id) => {
    const { data } = await api.get(`/stockopname/${id}`);
    setSel(data);
  };
  useEffect(() => {
    load();
    api.get('/master/units').then(r => setUnits(r.data)).catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/stockopname', form);
      setForm({ ...form, title: '', notes: '' });
      await load();
      open(data.id);
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal membuat opname'); }
  };
  const addItem = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post(`/stockopname/${sel.id}/items`, item);
      setItem({ ...item, asset_code: '', notes: '' });
      open(sel.id);
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal mencatat'); }
  };
  const delItem = async (itemId) => {
    if (!window.confirm('Hapus catatan item ini?')) return;
    try {
      await api.delete(`/stockopname/${sel.id}/items/${itemId}`);
      open(sel.id);
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal hapus'); }
  };
  const finish = async () => {
    if (!window.confirm('Selesaikan opname? Setelah selesai tidak bisa diubah.')) return;
    try {
      await api.post(`/stockopname/${sel.id}/finish`);
      await load();
      open(sel.id);
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal menyelesaikan'); }
  };
  const downloadCsv = async (id) => {
    const res = await api.get(`/stockopname/${id}/csv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = `opname-${id}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  if (sel) {
    return (
      <>
        <div className="topbar">
          <h2><Icon name="clipboard" /> {sel.title}</h2>
          <div className="topbar-actions">
            <button className="secondary" onClick={() => downloadCsv(sel.id)}><Icon name="file" size={15} /> CSV</button>
            <button className="secondary" onClick={() => { setSel(null); load(); }}>Kembali</button>
            {canWrite && sel.status === 'draft' && <button onClick={finish}><Icon name="check" size={15} /> Selesaikan</button>}
          </div>
        </div>
        {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
        <div className="grid">
          <div className="stat"><small>Unit</small><h3>{sel.unit_code}</h3></div>
          <div className="stat"><small>Tanggal</small><h3>{sel.opname_date?.slice(0, 10)}</h3></div>
          <div className="stat"><small>Status</small><h3>{sel.status}</h3></div>
          <div className="stat"><small>Dihitung</small><h3>{sel.total_counted || sel.items.length}{sel.status === 'selesai' ? `/${sel.total_assets}` : ''}</h3></div>
        </div>
        {canWrite && sel.status === 'draft' && (
          <div className="card">
            <h3><Icon name="scan" /> Catat Aset (kode/ketik manual)</h3>
            <form onSubmit={addItem}>
              <div className="toolbar">
                <input placeholder="Kode aset, mis. ALM/SD/2026/0001" value={item.asset_code} onChange={e => setItem({ ...item, asset_code: e.target.value })} required />
                <select value={item.result} onChange={e => setItem({ ...item, result: e.target.value })}>
                  <option value="ada">Ada</option>
                  <option value="hilang">Hilang</option>
                  <option value="rusak_ringan">Rusak ringan</option>
                  <option value="rusak_berat">Rusak berat</option>
                </select>
                <button><Icon name="plus" size={15} /> Catat</button>
              </div>
            </form>
          </div>
        )}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Nama</th><th>Hasil</th><th>Catatan</th>{sel.status === 'draft' && <th>Aksi</th>}</tr></thead>
              <tbody>{sel.items.map(i => (
                <tr key={i.id}>
                  <td>{i.asset_code}</td><td>{i.asset_name}</td>
                  <td><span className={`badge ${i.result === 'hilang' ? 'danger' : i.result === 'ada' ? 'ok' : 'warn'}`}>{i.result}</span></td>
                  <td>{i.notes || '-'}</td>
                  {sel.status === 'draft' && <td><button className="danger" onClick={() => delItem(i.id)}>Hapus</button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar"><h2><Icon name="clipboard" /> Stock Opname{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      {canWrite && (
        <div className="card">
          <h3><Icon name="plus" /> Opname Baru</h3>
          <form onSubmit={create}>
            <div className="form-grid">
              {!isScoped && (
                <select value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })} required>
                  <option value="">Pilih Unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
                </select>
              )}
              <input placeholder="Judul (mis. Opname Semester Ganjil)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <input type="date" value={form.opname_date} onChange={e => setForm({ ...form, opname_date: e.target.value })} required />
              <input placeholder="Catatan (opsional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div style={{ marginTop: 10 }}><button><Icon name="plus" size={15} /> Buat Opname</button></div>
          </form>
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Judul</th><th>Unit</th><th>Tanggal</th><th>Status</th><th>Dihitung</th><th>Hilang</th><th>Aksi</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td className="clickable" onClick={() => open(r.id)}>{r.title}</td>
                <td><span className="badge">{r.unit_code}</span></td>
                <td>{r.opname_date?.slice(0, 10)}</td>
                <td><span className={`badge ${r.status === 'selesai' ? 'ok' : 'warn'}`}>{r.status}</span></td>
                <td>{r.total_counted || 0}{r.status === 'selesai' ? `/${r.total_assets}` : ''}</td>
                <td>{r.total_missing || 0}</td>
                <td><button className="info" onClick={() => open(r.id)}>Detail</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}


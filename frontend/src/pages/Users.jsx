import { useEffect, useState } from 'react';
import api from '../api.js';

const empty = { name: '', email: '', password: '', role: 'operator', unit_id: '' };

export default function Users() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get('/users'), api.get('/master/units')]);
      setRows(a.data); setUnits(b.data);
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat user'); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (editId) await api.put('/users/' + editId, form);
      else await api.post('/users', form);
      setForm(empty); setEditId(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'Gagal simpan user'); }
  };

  const edit = (r) => {
    setEditId(r.id);
    setForm({ name: r.name, email: r.email, password: '', role: r.role, unit_id: r.unit_id || '' });
  };
  const del = async (id) => {
    if (!confirm('Hapus user ini?')) return;
    try { await api.delete('/users/' + id); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Gagal hapus user'); }
  };

  if (me?.role !== 'admin') return <div className="card"><p>Halaman ini khusus admin.</p></div>;

  return (
    <>
      <div className="topbar"><h2>Kelola User</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Unit</th><th>Aksi</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <td>{r.name}</td><td>{r.email}</td>
            <td><span className="badge">{r.role}</span></td>
            <td>{r.unit_code || '-'}</td>
            <td>
              <button className="secondary" onClick={() => edit(r)}>Edit</button>{' '}
              <button className="danger" onClick={() => del(r.id)}>Hapus</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="card">
        <h3>{editId ? 'Edit User' : 'Tambah User'}</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <input required placeholder="Nama" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editId} />
            <input type="password" placeholder={editId ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'} required={!editId} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
            <select value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })}>
              <option value="">- Semua Unit (yayasan) -</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <button>{editId ? 'Update' : 'Simpan'}</button>{' '}
            {editId && <button type="button" className="secondary" onClick={() => { setEditId(null); setForm(empty); }}>Batal</button>}
          </div>
        </form>
      </div>
    </>
  );
}

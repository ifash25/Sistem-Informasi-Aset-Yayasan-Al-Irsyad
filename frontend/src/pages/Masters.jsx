import { useEffect, useState } from 'react';
import api from '../api.js';

const emptyU = { code: '', name: '' };
const emptyC = { code: '', name: '' };
const emptyL = { unit_id: '', name: '' };

export default function Masters() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = me?.role === 'admin';
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [u, setU] = useState(emptyU);
  const [c, setC] = useState(emptyC);
  const [l, setL] = useState(emptyL);
  const [editU, setEditU] = useState(null);
  const [editC, setEditC] = useState(null);
  const [editL, setEditL] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [a, b, d] = await Promise.all([
        api.get('/master/units'), api.get('/master/categories'), api.get('/master/locations')
      ]);
      setUnits(a.data); setCats(b.data); setLocs(d.data);
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat master data'); }
  };
  useEffect(() => { load(); }, []);
  const fail = (e) => setErr(e.response?.data?.message || 'Operasi gagal');

  const submitU = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (editU) await api.put('/master/units/' + editU, u);
      else await api.post('/master/units', u);
      setU(emptyU); setEditU(null); load();
    } catch (e2) { fail(e2); }
  };
  const delU = async (id) => {
    if (!confirm('Hapus unit ini?')) return;
    try { await api.delete('/master/units/' + id); load(); }
    catch (e2) { fail(e2); }
  };
  const submitC = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (editC) await api.put('/master/categories/' + editC, c);
      else await api.post('/master/categories', c);
      setC(emptyC); setEditC(null); load();
    } catch (e2) { fail(e2); }
  };
  const delC = async (id) => {
    if (!confirm('Hapus kategori ini?')) return;
    try { await api.delete('/master/categories/' + id); load(); }
    catch (e2) { fail(e2); }
  };
  const submitL = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (editL) await api.put('/master/locations/' + editL, l);
      else await api.post('/master/locations', l);
      setL(emptyL); setEditL(null); load();
    } catch (e2) { fail(e2); }
  };
  const delL = async (id) => {
    if (!confirm('Hapus lokasi ini?')) return;
    try { await api.delete('/master/locations/' + id); load(); }
    catch (e2) { fail(e2); }
  };

  return (
    <>
      <div className="topbar"><h2>Master Data{!isAdmin && me?.unit_name ? ` — ${me.unit_name}` : ''}</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card">
        <h3>Unit — BPP, RQ, SD, SMP, SMK</h3>
        <table><thead><tr><th>Kode</th><th>Nama</th>{isAdmin && <th>Aksi</th>}</tr></thead>
        <tbody>{units.map(x => <tr key={x.id}><td>{x.code}</td><td>{x.name}</td>
          {isAdmin && <td>
            <button className="secondary" onClick={() => { setEditU(x.id); setU({ code: x.code, name: x.name }); }}>Edit</button>{' '}
            <button className="danger" onClick={() => delU(x.id)}>Hapus</button>
          </td>}
        </tr>)}</tbody></table>
        {isAdmin && (
        <form onSubmit={submitU} style={{ marginTop: 10 }}>
          <div className="toolbar">
            <input required placeholder="Kode (ex: SD)" value={u.code} onChange={e => setU({ ...u, code: e.target.value })} />
            <input required placeholder="Nama unit" value={u.name} onChange={e => setU({ ...u, name: e.target.value })} />
            <button>{editU ? 'Update Unit' : 'Tambah Unit'}</button>
            {editU && <button type="button" className="secondary" onClick={() => { setEditU(null); setU(emptyU); }}>Batal</button>}
          </div>
        </form>
        )}
      </div>
      <div className="card">
        <h3>Kategori</h3>
        <table><thead><tr><th>Kode</th><th>Nama</th>{isAdmin && <th>Aksi</th>}</tr></thead>
        <tbody>{cats.map(x => <tr key={x.id}><td>{x.code}</td><td>{x.name}</td>
          {isAdmin && <td>
            <button className="secondary" onClick={() => { setEditC(x.id); setC({ code: x.code, name: x.name }); }}>Edit</button>{' '}
            <button className="danger" onClick={() => delC(x.id)}>Hapus</button>
          </td>}
        </tr>)}</tbody></table>
        {isAdmin && (
        <form onSubmit={submitC} style={{ marginTop: 10 }}>
          <div className="toolbar">
            <input required placeholder="Kode" value={c.code} onChange={e => setC({ ...c, code: e.target.value })} />
            <input required placeholder="Nama kategori" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} />
            <button>{editC ? 'Update Kategori' : 'Tambah Kategori'}</button>
            {editC && <button type="button" className="secondary" onClick={() => { setEditC(null); setC(emptyC); }}>Batal</button>}
          </div>
        </form>
        )}
      </div>
      <div className="card">
        <h3>Lokasi / Ruangan</h3>
        <table><thead><tr><th>Unit</th><th>Lokasi</th><th>Aksi</th></tr></thead>
        <tbody>{locs.map(x => <tr key={x.id}><td>{x.unit_code}</td><td>{x.name}</td>
          <td>
            <button className="secondary" onClick={() => { setEditL(x.id); setL({ unit_id: x.unit_id, name: x.name }); }}>Edit</button>{' '}
            <button className="danger" onClick={() => delL(x.id)}>Hapus</button>
          </td>
        </tr>)}</tbody></table>
        <form onSubmit={submitL} style={{ marginTop: 10 }}>
          <div className="toolbar">
            {(isAdmin && !editL) ? (
            <select required value={l.unit_id} onChange={e => setL({ ...l, unit_id: e.target.value })}>
              <option value="">- Unit -</option>
              {units.map(x => <option key={x.id} value={x.id}>{x.code}</option>)}
            </select>
            ) : (
            <input value={(() => {
              const targetId = editL ? l.unit_id : (l.unit_id || units[0]?.id);
              const found = units.find(x => String(x.id) === String(targetId));
              return found ? `${found.code} (unit)` : 'Unit Anda';
            })()} disabled />
            )}
            <input required placeholder="Nama lokasi/ruangan" value={l.name} onChange={e => setL({ ...l, name: e.target.value })} />
            <button>{editL ? 'Update Lokasi' : 'Tambah Lokasi'}</button>
            {editL && <button type="button" className="secondary" onClick={() => { setEditL(null); setL(emptyL); }}>Batal</button>}
          </div>
        </form>
      </div>
    </>
  );
}

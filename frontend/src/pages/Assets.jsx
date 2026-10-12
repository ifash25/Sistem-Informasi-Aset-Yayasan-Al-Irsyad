import { useEffect, useState } from 'react';
import api from '../api.js';

const empty = { name:'', category_id:'', unit_id:'', location_id:'', brand:'', purchase_year:'', purchase_price:'', condition:'baik', description:'' };

export default function Assets() {
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [filter, setFilter] = useState({ unit_id:'', search:'' });
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const q = new URLSearchParams();
    if (filter.unit_id) q.append('unit_id', filter.unit_id);
    if (filter.search) q.append('search', filter.search);
    const { data } = await api.get('/assets?' + q.toString());
    setRows(data);
  };
  useEffect(() => {
    api.get('/master/units').then(r => setUnits(r.data));
    api.get('/master/categories').then(r => setCats(r.data));
    api.get('/master/locations').then(r => setLocs(r.data));
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    if (editId) await api.put('/assets/' + editId, fd);
    else await api.post('/assets', fd);
    setForm(empty); setPhoto(null); setEditId(null); load();
  };

  const edit = (r) => {
    setEditId(r.id);
    setForm({ name:r.name, category_id:r.category_id, unit_id:r.unit_id, location_id:r.location_id||'', brand:r.brand||'', purchase_year:r.purchase_year||'', purchase_price:r.purchase_price, condition:r.condition, description:r.description||'' });
  };
  const del = async (id) => { if (confirm('Hapus aset?')) { await api.delete('/assets/'+id); load(); } };

  return (
    <>
      <div className="topbar"><h2>Data Aset</h2></div>
      <div className="card">
        <div className="toolbar">
          <select value={filter.unit_id} onChange={e=>setFilter({...filter,unit_id:e.target.value})}>
            <option value="">Semua Unit</option>
            {units.map(u=><option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
          </select>
          <input placeholder="Cari nama/kode/merk" value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})} />
          <button onClick={load}>Filter</button>
        </div>
        <table>
          <thead><tr><th>Kode</th><th>Nama</th><th>Unit</th><th>Kategori</th><th>Kondisi</th><th>Harga</th><th>Aksi</th></tr></thead>
          <tbody>{rows.map(r=><tr key={r.id}>
            <td>{r.asset_code}</td><td>{r.name}</td><td><span className="badge">{r.unit_code}</span></td>
            <td>{r.category_name}</td><td>{r.condition}</td><td>{Number(r.purchase_price).toLocaleString('id-ID')}</td>
            <td><button className="secondary" onClick={()=>edit(r)}>Edit</button> <button className="danger" onClick={()=>del(r.id)}>Hapus</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="card">
        <h3>{editId ? 'Edit Aset' : 'Tambah Aset'}</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <input required placeholder="Nama aset" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <select required value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">- Kategori -</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select required value={form.unit_id} onChange={e=>setForm({...form,unit_id:e.target.value})}>
              <option value="">- Unit -</option>{units.map(u=><option key={u.id} value={u.id}>{u.code}</option>)}
            </select>
            <select value={form.location_id} onChange={e=>setForm({...form,location_id:e.target.value})}>
              <option value="">- Lokasi -</option>{locs.filter(l=>!form.unit_id||l.unit_id==form.unit_id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input placeholder="Merk" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} />
            <input placeholder="Tahun beli" value={form.purchase_year} onChange={e=>setForm({...form,purchase_year:e.target.value})} />
            <input type="number" placeholder="Harga" value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})} />
            <select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}>
              <option value="baik">baik</option><option value="rusak_ringan">rusak_ringan</option>
              <option value="rusak_berat">rusak_berat</option><option value="hilang">hilang</option>
            </select>
            <input type="file" onChange={e=>setPhoto(e.target.files[0])} />
          </div>
          <textarea style={{width:'100%',marginTop:8}} placeholder="Deskripsi" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          <div style={{marginTop:8}}><button>{editId?'Update':'Simpan'}</button> {editId&&<button type="button" className="secondary" onClick={()=>{setEditId(null);setForm(empty);}}>Batal</button>}</div>
        </form>
      </div>
    </>
  );
}

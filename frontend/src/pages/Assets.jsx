import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

const empty = { name:'', category_id:'', unit_id:'', location_id:'', brand:'', serial_number:'', purchase_year:'', purchase_price:'', condition:'baik', status:'aktif', description:'' };

export default function Assets() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const nav = useNavigate();
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const canWrite = me?.role === 'admin' || me?.role === 'operator';
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [filter, setFilter] = useState({ unit_id:'', search:'' });
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null);
  const [showCat, setShowCat] = useState(false);
  const [catForm, setCatForm] = useState({ code:'', name:'' });

  const openDetail = async (id) => {
    setErr('');
    try {
      const { data } = await api.get('/assets/' + id);
      setDetail(data);
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat detail aset'); }
  };

  const load = async () => {
    const q = new URLSearchParams();
    if (filter.unit_id) q.append('unit_id', filter.unit_id);
    if (filter.search) q.append('search', filter.search);
    const { data } = await api.get('/assets?' + q.toString());
    setRows(data);
  };
  useEffect(() => {
    api.get('/master/units').then(r => {
      setUnits(r.data);
      if (isScoped && r.data.length === 1) setForm(f => ({ ...f, unit_id: r.data[0].id }));
      else if (isScoped && me?.unit_id) setForm(f => ({ ...f, unit_id: me.unit_id }));
    });
    api.get('/master/categories').then(r => setCats(r.data));
    api.get('/master/locations').then(r => setLocs(r.data));
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      if (editId) await api.put('/assets/' + editId, fd);
      else await api.post('/assets', fd);
      setForm(empty); setPhoto(null); setEditId(null); load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal menyimpan aset'); }
  };

  const addCat = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/master/categories', catForm);
      api.get('/master/categories').then(r => setCats(r.data));
      setForm(f => ({ ...f, category_id: data.id }));
      setCatForm({ code:'', name:'' }); setShowCat(false);
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal menambah kategori'); }
  };

  const edit = (r) => {
    setEditId(r.id);
    setErr('');
    setForm({ name:r.name, category_id:r.category_id, unit_id:r.unit_id, location_id:r.location_id||'', brand:r.brand||'', serial_number:r.serial_number||'', purchase_year:r.purchase_year||'', purchase_price:r.purchase_price, condition:r.condition, status:r.status||'aktif', description:r.description||'' });
  };
  const del = async (id) => { if (confirm('Hapus aset?')) { await api.delete('/assets/'+id); load(); } };

  return (
    <>
      <div className="topbar"><h2><Icon name="box" /> Data Aset{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2><div className="topbar-actions"><button className="secondary" onClick={()=>nav('/label')}><Icon name="qr" size={15} /> Cetak Label QR</button><button className="secondary" onClick={()=>nav('/scan')}><Icon name="scan" size={15} /> Scan QR</button></div></div>
      {err && <div className="card"><p style={{color:'red'}}>{err}</p></div>}
      <div className="card">
        <div className="toolbar">
          {!isScoped && (
          <select value={filter.unit_id} onChange={e=>setFilter({...filter,unit_id:e.target.value})}>
            <option value="">Semua Unit</option>
            {units.map(u=><option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
          </select>
          )}
          <input placeholder="Cari nama/kode/merk" value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})} />
          <button onClick={load}>Filter</button>
        </div>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Foto</th><th>Kode</th><th>Nama</th><th>Unit</th><th>Kategori</th><th>Kondisi</th><th>Harga</th><th>Aksi</th></tr></thead>
          <tbody>{rows.map(r=><tr key={r.id}>
            <td>{r.photo ? <img className="thumb" src={r.photo} alt="" onClick={()=>openDetail(r.id)} /> : '-'}</td>
            <td><span className="clickable" onClick={()=>openDetail(r.id)}>{r.asset_code}</span></td><td>{r.name}</td><td><span className="badge">{r.unit_code}</span></td>
            <td>{r.category_name}</td><td>{r.condition}</td><td>{Number(r.purchase_price).toLocaleString('id-ID')}</td>
            <td><div className="actions">
              <button className="info" onClick={()=>openDetail(r.id)}>Detail</button>
              {canWrite && <><button className="secondary" onClick={()=>edit(r)}>Edit</button><button className="danger" onClick={()=>del(r.id)}>Hapus</button></>}
            </div></td>
          </tr>)}</tbody>
        </table>
        </div>
      </div>
      {canWrite && (
      <div className="card">
        <h3><Icon name="box" /> {editId ? 'Edit Aset' : 'Tambah Aset'}</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <input required placeholder="Nama aset" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <div style={{display:'flex',gap:6}}>
              <select required value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})} style={{flex:1}}>
                <option value="">- Kategori -</option>
                {cats.map(c=><option key={c.id} value={c.id}>{c.name}{c.unit_code ? ` (${c.unit_code})` : ''}</option>)}
              </select>
              {canWrite && <button type="button" className="secondary" title="Tambah kategori baru" onClick={()=>setShowCat(!showCat)} style={{whiteSpace:'nowrap'}}><Icon name="plus" size={14} /> Kategori</button>}
            </div>
            {showCat && (
              <div className="card" style={{gridColumn:'1 / -1',padding:10}}>
                <form onSubmit={addCat} className="toolbar" style={{margin:0}}>
                  <input required placeholder="Kode (ex: ELE)" value={catForm.code} onChange={e=>setCatForm({...catForm,code:e.target.value})} maxLength={10} />
                  <input required placeholder="Nama kategori" value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value})} />
                  <button>Simpan Kategori</button>
                  <button type="button" className="secondary" onClick={()=>{setShowCat(false);setCatForm({code:'',name:''});}}>Batal</button>
                  <span style={{fontSize:12,opacity:.7}}>{isScoped ? `Kategori milik unit ${me?.unit_name||''}` : 'Kategori global (semua unit)'}</span>
                </form>
              </div>
            )}
            <select required value={form.unit_id} onChange={e=>setForm({...form,unit_id:e.target.value})} disabled={isScoped}>
              <option value="">- Unit -</option>{units.map(u=><option key={u.id} value={u.id}>{u.code}</option>)}
            </select>
            <select value={form.location_id} onChange={e=>setForm({...form,location_id:e.target.value})}>
              <option value="">- Lokasi -</option>{locs.filter(l=>!form.unit_id||l.unit_id==form.unit_id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input placeholder="Merk" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} />
            <input placeholder="Serial number" value={form.serial_number} onChange={e=>setForm({...form,serial_number:e.target.value})} />
            <input placeholder="Tahun beli" value={form.purchase_year} onChange={e=>setForm({...form,purchase_year:e.target.value})} />
            <input type="number" placeholder="Harga" value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})} />
            <select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}>
              <option value="baik">baik</option><option value="rusak_ringan">rusak_ringan</option>
              <option value="rusak_berat">rusak_berat</option><option value="hilang">hilang</option>
            </select>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              <option value="aktif">aktif</option><option value="dipinjam">dipinjam</option>
              <option value="dimutasi">dimutasi</option><option value="dihapus">dihapus</option>
            </select>
            <input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} />
          </div>
          <textarea style={{width:'100%',marginTop:8}} placeholder="Deskripsi" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          <div style={{marginTop:8}}><button>{editId?'Update':'Simpan'}</button> {editId&&<button type="button" className="secondary" onClick={()=>{setEditId(null);setForm(empty);}}>Batal</button>}</div>
        </form>
      </div>
      )}
      {detail && (
      <div className="modal-backdrop" onClick={()=>setDetail(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <h3>Detail Aset — {detail.asset_code}</h3>
            <button className="secondary" onClick={()=>setDetail(null)}>Tutup</button>
          </div>
          <div className="detail-grid">
            <div>{detail.photo ? <img src={detail.photo} alt="" /> : <p>Tidak ada foto</p>}</div>
            <dl className="kv">
              <dt>Nama</dt><dd>{detail.name}</dd>
              <dt>Kode</dt><dd>{detail.asset_code}</dd>
              <dt>Unit</dt><dd>{detail.unit_code} — {detail.unit_name}</dd>
              <dt>Kategori</dt><dd>{detail.category_name}</dd>
              <dt>Lokasi</dt><dd>{detail.location_name || '-'}</dd>
              <dt>Merk</dt><dd>{detail.brand || '-'}</dd>
              <dt>Serial</dt><dd>{detail.serial_number || '-'}</dd>
              <dt>Tahun beli</dt><dd>{detail.purchase_year || '-'}</dd>
              <dt>Harga</dt><dd>Rp {Number(detail.purchase_price || 0).toLocaleString('id-ID')}</dd>
              <dt>Kondisi</dt><dd>{detail.condition}</dd>
              <dt>Status</dt><dd>{detail.status}</dd>
              <dt>Deskripsi</dt><dd>{detail.description || '-'}</dd>
            </dl>
          </div>
          <div style={{marginTop:14}}>
            <h4>Riwayat Mutasi</h4>
            {detail.mutations?.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Tanggal</th><th>Dari</th><th>Ke</th><th>Status</th></tr></thead>
              <tbody>{detail.mutations.map(m=><tr key={m.id}><td>{m.mutation_date?.slice(0,10)}</td><td>{m.from_unit || '-'}</td><td>{m.to_unit}</td><td>{m.status}</td></tr>)}</tbody>
            </table></div>
            ) : <p>- Belum ada mutasi -</p>}
          </div>
          <div style={{marginTop:10}}>
            <h4>Riwayat Servis</h4>
            {detail.maintenances?.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Tanggal</th><th>Jenis</th><th>Biaya</th><th>Vendor</th></tr></thead>
              <tbody>{detail.maintenances.map(s=><tr key={s.id}><td>{s.maintenance_date?.slice(0,10)}</td><td>{s.type}</td><td>{Number(s.cost || 0).toLocaleString('id-ID')}</td><td>{s.vendor || '-'}</td></tr>)}</tbody>
            </table></div>
            ) : <p>- Belum ada servis -</p>}
          </div>
          {canWrite && (
          <div style={{marginTop:12}}>
            <button className="secondary" onClick={()=>{edit(detail);setDetail(null);window.scrollTo(0, document.body.scrollHeight);}}>Edit Aset Ini</button>
          </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}

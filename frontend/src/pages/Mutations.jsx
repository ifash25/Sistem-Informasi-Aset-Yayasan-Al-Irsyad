import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Mutations() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = me?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [assets, setAssets] = useState([]);
  const [units, setUnits] = useState([]);
  const [locs, setLocs] = useState([]);
  const [servs, setServs] = useState([]);
  const [m, setM] = useState({ asset_id:'', to_unit_id:'', to_location_id:'', mutation_date:'', reason:'' });
  const [s, setS] = useState({ asset_id:'', maintenance_date:'', type:'', cost:'', vendor:'', notes:'' });

  const load = async () => {
    const [a,b,c,d,e] = await Promise.all([
      api.get('/mutations'), api.get('/assets'), api.get('/master/units'),
      api.get('/master/locations'), api.get('/mutations/maintenances')
    ]);
    setRows(a.data); setAssets(b.data); setUnits(c.data); setLocs(d.data); setServs(e.data);
  };
  useEffect(()=>{load();},[]);

  const submitMut = async (ev) => {
    ev.preventDefault();
    const { data } = await api.post('/mutations', m);
    alert(data.message || 'Tersimpan');
    setM({ asset_id:'', to_unit_id:'', to_location_id:'', mutation_date:'', reason:'' });
    load();
  };
  const actMut = async (id, act) => {
    if (!confirm(act === 'approve' ? 'Setujui mutasi ini?' : 'Tolak mutasi ini?')) return;
    const { data } = await api.post(`/mutations/${id}/${act}`);
    alert(data.message);
    load();
  };
  const submitServ = async (ev) => {
    ev.preventDefault();
    await api.post('/mutations/maintenances', s);
    setS({ asset_id:'', maintenance_date:'', type:'', cost:'', vendor:'', notes:'' });
    load();
  };

  return (
    <>
      <div className="topbar"><h2>Mutasi & Pemeliharaan</h2></div>
      <div className="card">
        <h3>Mutasi Aset Antar Unit</h3>
        <form onSubmit={submitMut}>
          <div className="form-grid">
            <select required value={m.asset_id} onChange={e=>setM({...m,asset_id:e.target.value})}>
              <option value="">- Pilih Aset -</option>
              {assets.map(a=><option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>)}
            </select>
            <select required value={m.to_unit_id} onChange={e=>setM({...m,to_unit_id:e.target.value})}>
              <option value="">- Unit Tujuan -</option>
              {units.map(u=><option key={u.id} value={u.id}>{u.code}</option>)}
            </select>
            <select value={m.to_location_id} onChange={e=>setM({...m,to_location_id:e.target.value})}>
              <option value="">- Lokasi Tujuan -</option>
              {locs.filter(l=>!m.to_unit_id||l.unit_id==m.to_unit_id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="date" required value={m.mutation_date} onChange={e=>setM({...m,mutation_date:e.target.value})} />
          </div>
          <input style={{width:'100%',marginTop:8}} placeholder="Alasan mutasi" value={m.reason} onChange={e=>setM({...m,reason:e.target.value})} />
          <div style={{marginTop:8}}><button>Simpan Mutasi</button></div>
        </form>
      </div>
      <div className="card">
        <h3>Riwayat Mutasi</h3>
        <div className="table-wrap">
        <table><thead><tr><th>Tanggal</th><th>Aset</th><th>Dari</th><th>Ke</th><th>Status</th><th>Alasan</th>{isAdmin && <th>Aksi</th>}</tr></thead>
        <tbody>{rows.map(r=><tr key={r.id}><td>{r.mutation_date?.slice(0,10)}</td><td>{r.asset_code}</td><td>{r.from_unit||'-'}</td><td>{r.to_unit}</td><td><span className="badge">{r.status || 'approved'}</span></td><td>{r.reason||''}</td>{isAdmin && <td><div className="actions">{r.status === 'pending' ? (<><button onClick={()=>actMut(r.id,'approve')}>Setujui</button> <button className="danger" onClick={()=>actMut(r.id,'reject')}>Tolak</button></>) : '-'}</div></td>}</tr>)}</tbody></table>
        </div>
      </div>
      <div className="card">
        <h3>Catat Servis / Pemeliharaan</h3>
        <form onSubmit={submitServ}>
          <div className="form-grid">
            <select required value={s.asset_id} onChange={e=>setS({...s,asset_id:e.target.value})}>
              <option value="">- Pilih Aset -</option>
              {assets.map(a=><option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>)}
            </select>
            <input type="date" required value={s.maintenance_date} onChange={e=>setS({...s,maintenance_date:e.target.value})} />
            <input required placeholder="Jenis (ex: servis AC)" value={s.type} onChange={e=>setS({...s,type:e.target.value})} />
            <input type="number" placeholder="Biaya" value={s.cost} onChange={e=>setS({...s,cost:e.target.value})} />
            <input placeholder="Vendor" value={s.vendor} onChange={e=>setS({...s,vendor:e.target.value})} />
          </div>
          <input style={{width:'100%',marginTop:8}} placeholder="Catatan" value={s.notes} onChange={e=>setS({...s,notes:e.target.value})} />
          <div style={{marginTop:8}}><button>Simpan Servis</button></div>
        </form>
      </div>
      <div className="card">
        <h3>Riwayat Servis</h3>
        <div className="table-wrap">
        <table><thead><tr><th>Tanggal</th><th>Aset</th><th>Jenis</th><th>Biaya</th><th>Vendor</th></tr></thead>
        <tbody>{servs.map(r=><tr key={r.id}><td>{r.maintenance_date?.slice(0,10)}</td><td>{r.asset_code}</td><td>{r.type}</td><td>{Number(r.cost).toLocaleString('id-ID')}</td><td>{r.vendor||''}</td></tr>)}</tbody></table>
        </div>
      </div>
    </>
  );
}

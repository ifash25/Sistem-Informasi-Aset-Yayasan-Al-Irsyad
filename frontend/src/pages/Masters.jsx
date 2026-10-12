import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Masters() {
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [u, setU] = useState({ code:'', name:'' });
  const [c, setC] = useState({ code:'', name:'' });
  const [l, setL] = useState({ unit_id:'', name:'' });

  const load = async () => {
    const [a,b,d] = await Promise.all([
      api.get('/master/units'), api.get('/master/categories'), api.get('/master/locations')
    ]);
    setUnits(a.data); setCats(b.data); setLocs(d.data);
  };
  useEffect(()=>{load();},[]);

  return (
    <>
      <div className="topbar"><h2>Master Data</h2></div>
      <div className="card">
        <h3>Unit — BPP, RQ, SD, SMP, SMK</h3>
        <table><thead><tr><th>Kode</th><th>Nama</th></tr></thead>
        <tbody>{units.map(x=><tr key={x.id}><td>{x.code}</td><td>{x.name}</td></tr>)}</tbody></table>
        <form onSubmit={async e=>{e.preventDefault();await api.post('/master/units',u);setU({code:'',name:''});load();}}>
          <div className="toolbar">
            <input required placeholder="Kode (ex: SD)" value={u.code} onChange={e=>setU({...u,code:e.target.value})} />
            <input required placeholder="Nama unit" value={u.name} onChange={e=>setU({...u,name:e.target.value})} />
            <button>Tambah Unit</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Kategori</h3>
        <table><thead><tr><th>Kode</th><th>Nama</th></tr></thead>
        <tbody>{cats.map(x=><tr key={x.id}><td>{x.code}</td><td>{x.name}</td></tr>)}</tbody></table>
        <form onSubmit={async e=>{e.preventDefault();await api.post('/master/categories',c);setC({code:'',name:''});load();}}>
          <div className="toolbar">
            <input required placeholder="Kode" value={c.code} onChange={e=>setC({...c,code:e.target.value})} />
            <input required placeholder="Nama kategori" value={c.name} onChange={e=>setC({...c,name:e.target.value})} />
            <button>Tambah Kategori</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Lokasi / Ruangan</h3>
        <table><thead><tr><th>Unit</th><th>Lokasi</th></tr></thead>
        <tbody>{locs.map(x=><tr key={x.id}><td>{x.unit_code}</td><td>{x.name}</td></tr>)}</tbody></table>
        <form onSubmit={async e=>{e.preventDefault();await api.post('/master/locations',l);setL({unit_id:'',name:''});load();}}>
          <div className="toolbar">
            <select required value={l.unit_id} onChange={e=>setL({...l,unit_id:e.target.value})}>
              <option value="">- Unit -</option>
              {units.map(x=><option key={x.id} value={x.id}>{x.code}</option>)}
            </select>
            <input required placeholder="Nama lokasi/ruangan" value={l.name} onChange={e=>setL({...l,name:e.target.value})} />
            <button>Tambah Lokasi</button>
          </div>
        </form>
      </div>
    </>
  );
}

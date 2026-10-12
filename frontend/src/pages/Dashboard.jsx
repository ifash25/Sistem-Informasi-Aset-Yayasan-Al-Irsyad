import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/dashboard/summary').then(r => setData(r.data)); }, []);
  if (!data) return <p>Memuat...</p>;
  return (
    <>
      <div className="topbar"><h2>Dashboard Aset</h2><a href="/api/dashboard/report.csv"><button className="secondary">Export CSV</button></a></div>
      <div className="grid">
        <div className="stat"><small>Total Aset</small><h3>{data.total}</h3></div>
        <div className="stat" style={{background:'#1d4ed8'}}><small>Total Nilai (Rp)</small><h3>{Number(data.nilai).toLocaleString('id-ID')}</h3></div>
      </div>
      <div className="card">
        <h3>Per Unit (BPP, RQ, SD, SMP, SMK)</h3>
        <table><thead><tr><th>Kode</th><th>Unit</th><th>Jumlah</th><th>Nilai (Rp)</th></tr></thead>
        <tbody>{data.perUnit.map(u => <tr key={u.code}><td>{u.code}</td><td>{u.name}</td><td>{u.jumlah}</td><td>{Number(u.nilai).toLocaleString('id-ID')}</td></tr>)}</tbody></table>
      </div>
      <div className="card">
        <h3>Kondisi Aset</h3>
        {data.perCond.map(c => <p key={c.condition}>{c.condition}: <b>{c.jumlah}</b></p>)}
      </div>
      <div className="card">
        <h3>Aset Terbaru</h3>
        <table><thead><tr><th>Kode</th><th>Nama</th><th>Unit</th></tr></thead>
        <tbody>{data.recent.map((r,i) => <tr key={i}><td>{r.asset_code}</td><td>{r.name}</td><td>{r.unit_code}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}

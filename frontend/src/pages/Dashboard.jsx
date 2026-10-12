import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Dashboard() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/dashboard/summary').then(r => setData(r.data)).catch(e => setErr(e.response?.data?.message || 'Gagal memuat dashboard'));
  }, []);
  const downloadCsv = async () => {
    try {
      const res = await api.get('/dashboard/report.csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'laporan-aset.csv'; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { setErr('Gagal export CSV'); }
  };
  if (err) return <div className="card"><p style={{color:'red'}}>{err}</p></div>;
  if (!data) return <p>Memuat...</p>;
  return (
    <>
      <div className="topbar"><h2>Dashboard Aset{data.scoped && me?.unit_name ? ` — ${me.unit_name}` : ''}</h2><button className="secondary" onClick={downloadCsv}>Export CSV</button></div>
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

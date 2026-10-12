import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Reports() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState({ unit_id: '', category_id: '', condition: '', search: '' });

  const load = async () => {
    const q = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) q.append(k, v); });
    const { data } = await api.get('/assets?' + q.toString());
    setRows(data);
  };
  useEffect(() => {
    api.get('/master/units').then(r => setUnits(r.data));
    api.get('/master/categories').then(r => setCats(r.data));
    load();
  }, []);

  const downloadCsv = async () => {
    const q = new URLSearchParams();
    if (filter.unit_id) q.append('unit_id', filter.unit_id);
    const res = await api.get('/dashboard/report.csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'laporan-aset.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalNilai = rows.reduce((s, r) => s + Number(r.purchase_price || 0), 0);

  return (
    <>
      <div className="topbar"><h2>Laporan Aset{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2><button className="secondary" onClick={downloadCsv}>Export CSV</button></div>
      <div className="card">
        <div className="toolbar">
          {!isScoped && (
          <select value={filter.unit_id} onChange={e => setFilter({ ...filter, unit_id: e.target.value })}>
            <option value="">Semua Unit</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
          </select>
          )}
          <select value={filter.category_id} onChange={e => setFilter({ ...filter, category_id: e.target.value })}>
            <option value="">Semua Kategori</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filter.condition} onChange={e => setFilter({ ...filter, condition: e.target.value })}>
            <option value="">Semua Kondisi</option>
            <option value="baik">baik</option>
            <option value="rusak_ringan">rusak_ringan</option>
            <option value="rusak_berat">rusak_berat</option>
            <option value="hilang">hilang</option>
          </select>
          <input placeholder="Cari..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
          <button onClick={load}>Tampilkan</button>
        </div>
        <p>Jumlah: <b>{rows.length}</b> aset — Total nilai: <b>Rp {totalNilai.toLocaleString('id-ID')}</b></p>
      </div>
      <div className="card">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Kode</th><th>Nama</th><th>Unit</th><th>Lokasi</th><th>Kategori</th><th>Kondisi</th><th>Harga</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <td>{r.asset_code}</td><td>{r.name}</td><td>{r.unit_code}</td>
            <td>{r.location_name || '-'}</td><td>{r.category_name}</td><td>{r.condition}</td>
            <td>{Number(r.purchase_price).toLocaleString('id-ID')}</td>
          </tr>)}</tbody>
        </table>
        </div>
      </div>
    </>
  );
}

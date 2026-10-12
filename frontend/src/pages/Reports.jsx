import { useEffect, useState } from 'react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Reports() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const isAdmin = me?.role === 'admin';
  const [tab, setTab] = useState('aset');
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState({ unit_id: '', category_id: '', condition: '', search: '' });
  // nilai aset & penyusutan
  const [val, setVal] = useState({ rows: [], total: {}, as_of: '' });
  const [policies, setPolicies] = useState([]);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [valFilter, setValFilter] = useState({ unit_id: '', category_id: '' });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const q = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) q.append(k, v); });
    const { data } = await api.get('/assets?' + q.toString());
    setRows(data);
  };
  const loadVal = async () => {
    const q = new URLSearchParams();
    if (valFilter.unit_id) q.append('unit_id', valFilter.unit_id);
    if (valFilter.category_id) q.append('category_id', valFilter.category_id);
    q.append('as_of', asOf);
    const { data } = await api.get('/depreciation/valuation?' + q.toString());
    setVal(data);
  };
  const loadPol = async () => {
    const { data } = await api.get('/depreciation/policies');
    setPolicies(data);
  };
  useEffect(() => {
    api.get('/master/units').then(r => setUnits(r.data));
    api.get('/master/categories').then(r => setCats(r.data));
    load();
    loadVal();
    loadPol();
  }, []);
  useEffect(() => { loadVal(); }, [asOf]);

  const downloadCsv = async () => {
    const q = new URLSearchParams();
    if (filter.unit_id) q.append('unit_id', filter.unit_id);
    const res = await api.get('/dashboard/report.csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'laporan-aset.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };
  const downloadValCsv = async () => {
    const q = new URLSearchParams();
    if (valFilter.unit_id) q.append('unit_id', valFilter.unit_id);
    if (valFilter.category_id) q.append('category_id', valFilter.category_id);
    q.append('as_of', asOf);
    const res = await api.get('/depreciation/valuation.csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'nilai-aset.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };
  const savePolicy = async (p) => {
    setMsg('');
    try {
      await api.put(`/depreciation/policies/${p.category_id}`, {
        method: p.method, useful_life_years: p.useful_life_years, residual_percent: p.residual_percent
      });
      setMsg(`Kebijakan ${p.category_name} tersimpan`);
      loadPol();
    } catch (e) { setMsg(e.response?.data?.message || 'Gagal menyimpan'); }
  };

  const totalNilai = rows.reduce((s, r) => s + Number(r.purchase_price || 0), 0);
  const rp = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

  return (
    <>
      <div className="topbar"><h2><Icon name="file" /> Laporan Aset{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2></div>
      <div className="tabbar no-print">
        <button className={tab === 'aset' ? 'active' : ''} onClick={() => setTab('aset')}><Icon name="box" size={15} /> Daftar Aset</button>
        <button className={tab === 'nilai' ? 'active' : ''} onClick={() => setTab('nilai')}><Icon name="coins" size={15} /> Nilai & Penyusutan</button>
      </div>
      {msg && <div className="card"><p style={{ color: '#0f766e' }}>{msg}</p></div>}
      {tab === 'aset' && (<>
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
        <p>Jumlah: <b>{rows.length}</b> aset — Total nilai: <b>Rp {totalNilai.toLocaleString('id-ID')}</b> <button className="secondary no-print" onClick={downloadCsv}><Icon name="file" size={15} /> Export CSV</button></p>
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
      </>)}
      {tab === 'nilai' && (<>
      <div className="card">
        <h3><Icon name="coins" /> Laporan Nilai Aset & Penyusutan</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          Metode garis lurus (PSAK 16 disederhanakan): penyusutan dimulai Januari tahun berikut perolehan,
          tanpa aktiva/pendapatan pajak. ATK ditetapkan tanpa susut.
        </p>
        <div className="toolbar">
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} title="Posisi tanggal laporan" />
          {!isScoped && (
            <select value={valFilter.unit_id} onChange={e => setValFilter({ ...valFilter, unit_id: e.target.value })}>
              <option value="">Semua Unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
            </select>
          )}
          <select value={valFilter.category_id} onChange={e => setValFilter({ ...valFilter, category_id: e.target.value })}>
            <option value="">Semua Kategori</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={loadVal}>Tampilkan</button>
          <button className="secondary" onClick={downloadValCsv}><Icon name="file" size={15} /> Export CSV</button>
        </div>
        <div className="grid">
          <div className="stat"><small>Harga Perolehan</small><h3>{rp(val.total?.harga)}</h3></div>
          <div className="stat"><small>Akumulasi Penyusutan</small><h3>{rp(val.total?.akumulasi)}</h3></div>
          <div className="stat"><small>Nilai Buku</small><h3>{rp(val.total?.buku)}</h3></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kode</th><th>Nama</th><th>Unit</th><th>Kategori</th><th>Thn</th><th>Harga</th><th>Metode</th><th>Umur</th><th>Akum. Susut</th><th>Nilai Buku</th></tr></thead>
            <tbody>{val.rows.map(r => (
              <tr key={r.id}>
                <td>{r.asset_code}</td><td>{r.name}</td><td>{r.unit_code}</td><td>{r.category_name}</td>
                <td>{r.purchase_year || '-'}</td>
                <td>{Number(r.purchase_price).toLocaleString('id-ID')}</td>
                <td><span className="badge">{r.method}</span></td>
                <td>{r.useful_life_years} th</td>
                <td>{Number(r.akumulasi_penyusutan).toLocaleString('id-ID')}</td>
                <td><b>{Number(r.nilai_buku).toLocaleString('id-ID')}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {isAdmin && (
      <div className="card">
        <h3><Icon name="database" /> Kebijakan Penyusutan per Kategori (admin)</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kategori</th><th>Metode</th><th>Umur Manfaat (th)</th><th>Residu (%)</th><th>Aksi</th></tr></thead>
            <tbody>{policies.map(p => (
              <tr key={p.category_id}>
                <td>{p.category_name}</td>
                <td>
                  <select value={p.method} onChange={e => setPolicies(policies.map(x => x.category_id === p.category_id ? { ...x, method: e.target.value } : x))}>
                    <option value="garis_lurus">Garis lurus</option>
                    <option value="tanpa_susut">Tanpa susut</option>
                  </select>
                </td>
                <td><input type="number" min="1" max="100" style={{ width: 90 }} value={p.useful_life_years}
                  onChange={e => setPolicies(policies.map(x => x.category_id === p.category_id ? { ...x, useful_life_years: e.target.value } : x))} /></td>
                <td><input type="number" min="0" max="100" style={{ width: 90 }} value={p.residual_percent}
                  onChange={e => setPolicies(policies.map(x => x.category_id === p.category_id ? { ...x, residual_percent: e.target.value } : x))} /></td>
                <td><button onClick={() => savePolicy(p)}>Simpan</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      )}
      </>)}
    </>
  );
}

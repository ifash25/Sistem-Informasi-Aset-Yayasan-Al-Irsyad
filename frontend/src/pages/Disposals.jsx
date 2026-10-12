import { useEffect, useState } from 'react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Disposals() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = me?.role === 'admin';
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const [rows, setRows] = useState([]);
  const [assets, setAssets] = useState([]);
  const [f, setF] = useState({ asset_id: '', disposal_date: '', reason: 'rusak_berat', description: '', ba_number: '' });
  const [err, setErr] = useState('');
  const [ba, setBa] = useState(null);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get('/disposals'), api.get('/assets')]);
      setRows(a.data);
      setAssets(b.data.filter(x => x.status !== 'dihapus'));
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat'); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/disposals', f);
      alert(data.message);
      setF({ asset_id: '', disposal_date: '', reason: 'rusak_berat', description: '', ba_number: '' });
      load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Gagal'); }
  };
  const act = async (id, a) => {
    if (!confirm(a === 'approve' ? 'Setujui penghapusan? Aset jadi status dihapus.' : 'Tolak penghapusan?')) return;
    try {
      const { data } = await api.post(`/disposals/${id}/${a}`);
      alert(data.message); load();
    } catch (e) { setErr(e.response?.data?.message || 'Gagal'); }
  };
  const printBa = async (id) => {
    try {
      const { data } = await api.get(`/disposals/${id}/ba`);
      setBa(data);
      setTimeout(() => window.print(), 300);
    } catch (e) { setErr('Gagal memuat berita acara'); }
  };

  return (
    <>
      <div className="topbar"><h2><Icon name="trash" /> Penghapusan Aset{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card">
        <h3>Ajukan Penghapusan</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <select required value={f.asset_id} onChange={e => setF({ ...f, asset_id: e.target.value })}>
              <option value="">- Pilih Aset -</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>)}
            </select>
            <input type="date" required value={f.disposal_date} onChange={e => setF({ ...f, disposal_date: e.target.value })} />
            <select value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })}>
              <option value="rusak_berat">rusak_berat</option>
              <option value="hilang">hilang</option>
              <option value="dijual">dijual</option>
              <option value="dihibahkan">dihibahkan</option>
              <option value="lainnya">lainnya</option>
            </select>
            <input placeholder="No. Berita Acara (opsional)" value={f.ba_number} onChange={e => setF({ ...f, ba_number: e.target.value })} />
          </div>
          <textarea style={{ width: '100%', marginTop: 8 }} placeholder="Keterangan / kronologi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <div style={{ marginTop: 8 }}><button>Ajukan</button></div>
        </form>
        {!isAdmin && <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>Pengajuan operator berstatus pending — aset baru dihapus setelah admin menyetujui.</p>}
      </div>
      <div className="card">
        <h3>Riwayat Penghapusan</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Aset</th><th>Unit</th><th>Alasan</th><th>Status</th><th>BA</th>{isAdmin && <th>Aksi</th>}</tr></thead>
            <tbody>{rows.map(r => <tr key={r.id}>
              <td>{r.disposal_date?.slice(0, 10)}</td><td>{r.asset_code}</td><td>{r.unit_code}</td>
              <td>{r.reason}</td><td><span className="badge">{r.status}</span></td>
              <td><button className="secondary" onClick={() => printBa(r.id)}>Cetak</button></td>
              {isAdmin && <td><div className="actions">{r.status === 'pending'
                ? (<><button onClick={() => act(r.id, 'approve')}>Setujui</button> <button className="danger" onClick={() => act(r.id, 'reject')}>Tolak</button></>)
                : '-'}</div></td>}
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      {ba && (
        <div className="card print-area">
          <h3 style={{ textAlign: 'center' }}>BERITA ACARA PENGHAPUSAN ASET</h3>
          <p style={{ textAlign: 'center' }}>Yayasan Al-Irsyad — Nomor: {ba.ba_number || '-'}</p>
          <p>Pada hari ini, telah dilakukan penghapusan aset dengan rincian:</p>
          <dl className="kv">
            <dt>Kode Aset</dt><dd>{ba.asset_code}</dd>
            <dt>Nama</dt><dd>{ba.asset_name}</dd>
            <dt>Kategori</dt><dd>{ba.category_name}</dd>
            <dt>Unit</dt><dd>{ba.unit_name}</dd>
            <dt>Merk / Serial</dt><dd>{ba.brand || '-'} / {ba.serial_number || '-'}</dd>
            <dt>Tahun / Harga</dt><dd>{ba.purchase_year || '-'} / Rp {Number(ba.purchase_price || 0).toLocaleString('id-ID')}</dd>
            <dt>Tanggal Hapus</dt><dd>{ba.disposal_date?.slice(0, 10)}</dd>
            <dt>Alasan</dt><dd>{ba.reason}</dd>
            <dt>Keterangan</dt><dd>{ba.description || '-'}</dd>
            <dt>Diajukan oleh</dt><dd>{ba.created_name || '-'}</dd>
          </dl>
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            <div style={{ flex: 1, textAlign: 'center' }}><p>Pengaju</p><br /><br /><p>( .................... )</p></div>
            <div style={{ flex: 1, textAlign: 'center' }}><p>Mengetahui, Pimpinan</p><br /><br /><p>( .................... )</p></div>
          </div>
          <div className="no-print" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => setBa(null)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}
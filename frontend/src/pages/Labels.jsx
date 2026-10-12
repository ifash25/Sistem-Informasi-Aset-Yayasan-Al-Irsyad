import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Labels() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isScoped = me?.role !== 'admin' && !!me?.unit_id;
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [filter, setFilter] = useState({ unit_id: '', search: '' });
  const [picked, setPicked] = useState({});
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const q = new URLSearchParams();
      if (filter.unit_id) q.append('unit_id', filter.unit_id);
      if (filter.search) q.append('search', filter.search);
      const [{ data }, u] = await Promise.all([
        api.get('/assets?' + q.toString()), api.get('/master/units'),
      ]);
      setRows(data.filter(x => x.status !== 'dihapus'));
      setUnits(u.data);
    } catch (e) { setErr(e.response?.data?.message || 'Gagal memuat'); }
  };
  useEffect(() => { load(); }, []);

  const toggle = (id) => setPicked(p => ({ ...p, [id]: !p[id] }));
  const all = (v) => {
    const o = {};
    rows.forEach(r => { o[r.id] = v; });
    setPicked(o);
  };
  const selected = rows.filter(r => picked[r.id]);

  return (
    <>
      <div className="topbar no-print">
        <h2><Icon name="qr" /> Label QR Code{isScoped ? ` — ${me.unit_name || ''}` : ''}</h2>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => all(true)}>Pilih Semua</button>
          <button className="secondary" onClick={() => all(false)}>Batal Pilih</button>
          <button onClick={() => window.print()} disabled={!selected.length}>
            <Icon name="print" size={15} /> Cetak {selected.length ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
      {err && <div className="card no-print"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card no-print">
        <div className="toolbar">
          {!isScoped && (
            <select value={filter.unit_id} onChange={e => setFilter({ ...filter, unit_id: e.target.value })}>
              <option value="">Semua Unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
            </select>
          )}
          <input placeholder="Cari nama/kode" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
          <button onClick={load}>Filter</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th><input type="checkbox" checked={rows.length > 0 && rows.every(r => picked[r.id])} onChange={e => all(e.target.checked)} /></th><th>Kode</th><th>Nama</th><th>Unit</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.id}>
              <td><input type="checkbox" checked={!!picked[r.id]} onChange={() => toggle(r.id)} /></td>
              <td>{r.asset_code}</td><td>{r.name}</td><td>{r.unit_code}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="card">
          <h3 className="no-print">Pratinjau Label ({selected.length})</h3>
          <div className="label-sheet">
            {selected.map(r => (
              <div className="label-item" key={r.id}>
                <QRCodeSVG value={r.asset_code} size={110} />
                <div className="label-code">{r.asset_code}</div>
                <div className="label-name">{r.name}</div>
                <div className="label-unit">Yayasan Al-Irsyad — {r.unit_code}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

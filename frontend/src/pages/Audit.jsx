import { useEffect, useState } from 'react';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Audit() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ actions: [], entities: [], users: [] });
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ action: '', entity: '', user_id: '', from: '', to: '', search: '' });

  const load = async () => {
    const q = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) q.append(k, v); });
    const { data } = await api.get('/audit?' + q.toString());
    setRows(data.rows);
    setTotal(data.total);
  };
  useEffect(() => {
    load();
    api.get('/audit/meta').then(r => setMeta(r.data)).catch(() => {});
  }, []);

  const downloadCsv = async () => {
    const q = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) q.append(k, v); });
    const res = await api.get('/audit/csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'audit-trail.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="topbar">
        <h2><Icon name="history" /> Audit Trail</h2>
        <button className="secondary" onClick={downloadCsv}><Icon name="file" size={15} /> Export CSV</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })}>
            <option value="">Semua Aksi</option>
            {meta.actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filter.entity} onChange={e => setFilter({ ...filter, entity: e.target.value })}>
            <option value="">Semua Entitas</option>
            {meta.entities.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filter.user_id} onChange={e => setFilter({ ...filter, user_id: e.target.value })}>
            <option value="">Semua User</option>
            {meta.users.map(u => <option key={u.user_id} value={u.user_id}>{u.user_name}</option>)}
          </select>
          <input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} />
          <input type="date" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} />
          <input placeholder="Cari user/detail..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
          <button onClick={load}>Filter</button>
        </div>
        <p>Total {total} baris — menampilkan {rows.length} terakhir</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Waktu</th><th>User</th><th>Role</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Detail</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                <td>{r.user_name || '-'}</td>
                <td><span className="badge">{r.user_role || '-'}</span></td>
                <td><span className={`badge ${r.action === 'delete' || r.action === 'reject' ? 'danger' : r.action === 'approve' ? 'ok' : ''}`}>{r.action}</span></td>
                <td>{r.entity}</td>
                <td>{r.entity_id || '-'}</td>
                <td style={{ maxWidth: 320, fontSize: 12, wordBreak: 'break-word' }}>{r.detail && r.detail !== 'null' ? r.detail : '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

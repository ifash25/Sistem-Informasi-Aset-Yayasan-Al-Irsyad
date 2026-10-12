import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Scan() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [scanning, setScanning] = useState(false);
  const qrRef = useRef(null);
  const nav = useNavigate();

  const lookup = async (c) => {
    const v = (c || '').trim();
    if (!v) return;
    setErr(''); setResult(null);
    try {
      const { data } = await api.get('/assets/lookup/' + encodeURIComponent(v));
      setResult(data);
    } catch (e) { setErr(e.response?.data?.message || 'Aset tidak ditemukan'); }
  };

  const startScan = async () => {
    setErr('');
    try {
      setScanning(true);
      await new Promise(r => setTimeout(r, 50));
      const qr = new Html5Qrcode('qr-reader');
      qrRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          setCode(text);
          lookup(text);
          stopScan();
        },
        () => {}
      );
    } catch (e) {
      setErr('Kamera tidak bisa dibuka: ' + (e.message || e));
      setScanning(false);
    }
  };
  const stopScan = async () => {
    try { await qrRef.current?.stop(); await qrRef.current?.clear(); } catch (e) {}
    qrRef.current = null;
    setScanning(false);
  };
  useEffect(() => () => { stopScan(); }, []);

  return (
    <>
      <div className="topbar"><h2><Icon name="scan" /> Scan QR Aset</h2></div>
      {err && <div className="card"><p style={{ color: 'red' }}>{err}</p></div>}
      <div className="card">
        <div className="toolbar">
          <input placeholder="Ketik / tempel kode (ex: ALM/SMK/2026/0001)" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={() => lookup(code)}>Cari</button>
          {!scanning
            ? <button className="info" onClick={startScan}>Buka Kamera</button>
            : <button className="danger" onClick={stopScan}>Tutup Kamera</button>}
        </div>
        <div id="qr-reader" style={{ width: '100%', maxWidth: 420 }} />
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
          Tempel stiker QR hasil cetak ke kamera HP/laptop. Butuh HTTPS atau localhost agar kamera aktif.
        </p>
      </div>
      {result && (
        <div className="card">
          <div className="detail-grid">
            <div>{result.photo ? <img src={result.photo} alt="" /> : <p>Tidak ada foto</p>}</div>
            <dl className="kv">
              <dt>Kode</dt><dd>{result.asset_code}</dd>
              <dt>Nama</dt><dd>{result.name}</dd>
              <dt>Unit</dt><dd>{result.unit_code} — {result.unit_name}</dd>
              <dt>Kategori</dt><dd>{result.category_name}</dd>
              <dt>Lokasi</dt><dd>{result.location_name || '-'}</dd>
              <dt>Merk</dt><dd>{result.brand || '-'}</dd>
              <dt>Kondisi</dt><dd>{result.condition}</dd>
              <dt>Status</dt><dd>{result.status}</dd>
            </dl>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="secondary" onClick={() => nav('/aset')}>Buka Data Aset</button>
          </div>
        </div>
      )}
    </>
  );
}

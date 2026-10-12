import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('admin@alirsyad.sch.id');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e) { setErr(e.response?.data?.message || 'Login gagal'); }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h1>SI Aset Yayasan Al-Irsyad</h1>
        <p>Unit BPP • RQ • SD • SMP • SMK</p>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        {err && <p style={{color:'red', marginTop:8}}>{err}</p>}
        <button>Masuk</button>
      </form>
    </div>
  );
}

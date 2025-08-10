"use client";
import { useState } from 'react';
import { login } from '@/api/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(id, password);
      // Persist token choice
      try {
        if (remember) localStorage.setItem('remember_me', '1');
        else localStorage.removeItem('remember_me');
      } catch {}
      router.push('/');
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Log in</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Username or Email</label>
          <input className="w-full border rounded px-3 py-2" value={id} onChange={(e) => setId(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm" style={{alignItems:'center'}}>
            <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} style={{width:14,height:14}} />
            Remember me
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
        </div>
      </form>
      <div className="mt-3 text-sm">
        No account? <a className="text-blue-600 underline" href="/register">Register</a>
      </div>
    </div>
  );
}



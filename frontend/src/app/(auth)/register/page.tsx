"use client";
import { useState } from 'react';
import { register } from '@/api/client';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    birthday: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    activity_level: 'sedentary',
    goal_type: 'maintain',
  });
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      };
      const res = await register(payload);
      // Store a minimal profile snapshot to merge later in Profile page
      try {
        localStorage.setItem('profile_prefill', JSON.stringify({
          age: payload.age,
          weight_kg: payload.weight_kg,
          height_cm: payload.height_cm,
          gender: payload.gender,
          activity_level: payload.activity_level,
          goal_type: payload.goal_type,
        }));
        if (remember) localStorage.setItem('remember_me', '1');
      } catch {}
      router.push('/');
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create your account</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input className="w-full border rounded px-3 py-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Birthday</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select className="w-full border rounded px-3 py-2" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height (cm)</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Weight (kg)</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Activity Level</label>
          <select className="w-full border rounded px-3 py-2" value={form.activity_level} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very Active</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Goal Type</label>
          <select className="w-full border rounded px-3 py-2" value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value })}>
            <option value="maintain">Maintain</option>
            <option value="lose_weight">Lose Weight</option>
            <option value="gain_weight">Gain Weight</option>
            <option value="muscle_gain">Muscle Gain</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm" style={{alignItems:'center'}}>
            <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} style={{width:14,height:14}} />
            Remember me
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        </div>
      </form>
      <div className="mt-3 text-sm">
        Already have an account? <a className="text-blue-600 underline" href="/login">Log in</a>
      </div>
    </div>
  );
}



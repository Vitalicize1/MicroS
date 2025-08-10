"use client";
import { useState } from 'react';
import { API_BASE } from '@/api/client';

export default function SummaryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLoad = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/summary/day?user_id=1&date=today`);
      if (!res.ok) throw new Error(`summary failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const ds = data;
  const totals = ds?.totals || {};
  const meals = ds?.meals || [];

  return (
    <div>
      <h2>Daily Summary</h2>
      <button onClick={onLoad} disabled={loading}>Load</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{color:'crimson'}}>{error}</p>}

      {ds && (
        <div className="grid mt-3">
          <div className="card">
            <h3 style={{marginTop:0}}>Totals ({ds.date})</h3>
            <table>
              <tbody>
                {Object.entries(totals).map(([k,v]) => (
                  <tr key={k}><th style={{width:200}}>{k}</th><td>{typeof v === 'number' ? v.toFixed(1) : String(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3 style={{marginTop:0}}>Meals ({ds.meal_count})</h3>
            <table>
              <thead>
                <tr><th>ID</th><th>Food</th><th>Grams</th><th>Type</th><th>Logged At</th></tr>
              </thead>
              <tbody>
                {meals.map((m:any)=> (
                  <tr key={m.id}><td>{m.id}</td><td>{m.food_name}</td><td>{m.grams}</td><td>{m.meal_type}</td><td>{m.logged_at}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

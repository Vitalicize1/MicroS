"use client";
import { useState } from 'react';
import { postAgent } from '@/api/client';

export default function RecommendPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLoad = async () => {
    setLoading(true); setError(null);
    try {
      const res = await postAgent(1, 'recommend foods');
      setData(res);
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const recs = data?.recommendations || [];

  return (
    <div>
      <h2>Recommendations</h2>
      <button onClick={onLoad} disabled={loading}>Get recommendations</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{color:'crimson'}}>{error}</p>}

      {recs.length > 0 && (
        <div className="card mt-3">
          <table>
            <thead>
              <tr><th>Food</th><th>Brand</th><th>Coverage</th><th>Calories/100g</th></tr>
            </thead>
            <tbody>
              {recs.map((r:any)=> (
                <tr key={r.food_id}>
                  <td>{r.name}</td>
                  <td>{r.brand || '-'}</td>
                  <td>{Object.entries(r.coverage).map(([k,v])=>`${k}: +${(v as number).toFixed(1)}`).join(', ')}</td>
                  <td>{r.calories_per_100g ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

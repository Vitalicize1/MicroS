"use client";
import { useState, useEffect } from 'react';
import { get } from '@/api/client';

interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  micronutrients: {
    [key: string]: number;
  };
  meal_count: number;
  foods_logged: Array<{
    name: string;
    grams: number;
    meal_type: string;
    calories: number;
  }>;
}

interface MicronutrientProgressProps {
  name: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

function MicronutrientProgress({ name, current, target, unit, color }: MicronutrientProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isLow = percentage < 50;
  const isGood = percentage >= 80;
  
  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>{name}</span>
        <span style={{ fontSize: '12px', color: isGood ? '#10b981' : isLow ? '#ef4444' : '#f59e0b' }}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <div style={{ 
        height: '8px', 
        background: '#f3f4f6', 
        borderRadius: '4px', 
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <div 
          style={{ 
            height: '100%', 
            background: isGood ? '#10b981' : isLow ? '#ef4444' : '#f59e0b',
            width: `${percentage}%`,
            transition: 'width 0.3s'
          }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
        <span>{current.toFixed(1)} {unit}</span>
        <span>Goal: {target} {unit}</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daily recommended values for micronutrients (adult baseline)
  const dailyTargets = {
    // Fat-soluble
    vitamin_a_rae: 900,
    vitamin_d_iu: 600,
    vitamin_e_mg: 15,
    vitamin_k_mcg: 120,
    // Water-soluble
    vitamin_c_mg: 90,
    vitamin_b1_mg: 1.2,
    vitamin_b2_mg: 1.3,
    vitamin_b3_mg: 16,
    vitamin_b5_mg: 5,
    vitamin_b6_mg: 1.3,
    vitamin_b7_mcg: 30,
    vitamin_b9_mcg: 400,
    vitamin_b12_mcg: 2.4,
    choline_mg: 550,
    // Macrominerals
    calcium_mg: 1000,
    phosphorus_mg: 700,
    magnesium_mg: 400,
    sodium_mg: 2300,
    potassium_mg: 3500,
    chloride_mg: 2300,
    sulfur_mg: 0,
    // Trace
    iron_mg: 18,
    zinc_mg: 11,
    copper_mg: 0.9,
    manganese_mg: 2.3,
    iodine_mcg: 150,
    selenium_mcg: 55,
    chromium_mcg: 35,
    molybdenum_mcg: 45,
    fluoride_mg: 4
  } as const;

  const micronutrientLabels: Record<string, string> = {
    // Fat-soluble
    vitamin_a_rae: 'Vitamin A',
    vitamin_d_iu: 'Vitamin D',
    vitamin_e_mg: 'Vitamin E',
    vitamin_k_mcg: 'Vitamin K',
    // Water-soluble
    vitamin_c_mg: 'Vitamin C',
    vitamin_b1_mg: 'Vitamin B1 (Thiamin)',
    vitamin_b2_mg: 'Vitamin B2 (Riboflavin)',
    vitamin_b3_mg: 'Vitamin B3 (Niacin)',
    vitamin_b5_mg: 'Vitamin B5 (Pantothenic Acid)',
    vitamin_b6_mg: 'Vitamin B6',
    vitamin_b7_mcg: 'Vitamin B7 (Biotin)',
    vitamin_b9_mcg: 'Vitamin B9 (Folate)',
    vitamin_b12_mcg: 'Vitamin B12',
    choline_mg: 'Choline',
    // Macrominerals
    calcium_mg: 'Calcium',
    phosphorus_mg: 'Phosphorus',
    magnesium_mg: 'Magnesium',
    sodium_mg: 'Sodium',
    potassium_mg: 'Potassium',
    chloride_mg: 'Chloride',
    sulfur_mg: 'Sulfur',
    // Trace
    iron_mg: 'Iron',
    zinc_mg: 'Zinc',
    copper_mg: 'Copper',
    manganese_mg: 'Manganese',
    iodine_mcg: 'Iodine',
    selenium_mcg: 'Selenium',
    chromium_mcg: 'Chromium',
    molybdenum_mcg: 'Molybdenum',
    fluoride_mg: 'Fluoride'
  };

  const micronutrientUnits: Record<string, string> = {
    vitamin_a_rae: 'µg',
    vitamin_d_iu: 'IU',
    vitamin_e_mg: 'mg',
    vitamin_k_mcg: 'µg',
    vitamin_c_mg: 'mg',
    vitamin_b1_mg: 'mg',
    vitamin_b2_mg: 'mg',
    vitamin_b3_mg: 'mg',
    vitamin_b5_mg: 'mg',
    vitamin_b6_mg: 'mg',
    vitamin_b7_mcg: 'µg',
    vitamin_b9_mcg: 'µg',
    vitamin_b12_mcg: 'µg',
    choline_mg: 'mg',
    calcium_mg: 'mg',
    phosphorus_mg: 'mg',
    magnesium_mg: 'mg',
    sodium_mg: 'mg',
    potassium_mg: 'mg',
    chloride_mg: 'mg',
    sulfur_mg: 'mg',
    iron_mg: 'mg',
    zinc_mg: 'mg',
    copper_mg: 'mg',
    manganese_mg: 'mg',
    iodine_mcg: 'µg',
    selenium_mcg: 'µg',
    chromium_mcg: 'µg',
    molybdenum_mcg: 'µg',
    fluoride_mg: 'mg'
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await get('/summary/day?user_id=1&date=today');
      setSummary(data as DailySummary);
    } catch (e: any) {
      setError(e?.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading your nutrition overview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ color: '#dc2626', marginBottom: '16px' }}>Error: {error}</div>
        <button className="btn btn-primary" onClick={fetchSummary}>Try Again</button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '16px' }}>
          No nutrition data for today yet.
        </div>
        <div style={{ color: '#6b7280' }}>
          Start by <a href="/" style={{ color: '#3b82f6' }}>searching and logging some foods</a>!
        </div>
      </div>
    );
  }

  // Calculate macronutrient percentages (rough targets)
  const calorieTarget = 2000;
  const proteinTarget = 150; // grams
  const fatTarget = 65; // grams  
  const carbTarget = 250; // grams

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          📊 Today's Nutrition Overview
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Track your daily micronutrient and macronutrient intake
        </p>
      </div>

      {/* Macronutrient Summary */}
      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#3b82f6' }}>
            {(summary.total_calories || 0).toFixed(0)}
          </div>
          <div className="stat-label">Calories</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {(((summary.total_calories || 0) / calorieTarget) * 100).toFixed(0)}% of {calorieTarget} goal
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10b981' }}>
            {(summary.total_protein || 0).toFixed(0)}g
          </div>
          <div className="stat-label">Protein</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {(((summary.total_protein || 0) / proteinTarget) * 100).toFixed(0)}% of {proteinTarget}g goal
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {(summary.total_fat || 0).toFixed(0)}g
          </div>
          <div className="stat-label">Fat</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {(((summary.total_fat || 0) / fatTarget) * 100).toFixed(0)}% of {fatTarget}g goal
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: '#8b5cf6' }}>
            {(summary.total_carbs || 0).toFixed(0)}g
          </div>
          <div className="stat-label">Carbohydrates</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {(((summary.total_carbs || 0) / carbTarget) * 100).toFixed(0)}% of {carbTarget}g goal
          </div>
        </div>
      </div>

      {/* Micronutrient Progress */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          🧪 Micronutrient Progress (Full)
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          {Object.entries(dailyTargets).map(([key, target]) => {
            const current = (summary.micronutrients && summary.micronutrients[key]) || 0;
            const label = micronutrientLabels[key as keyof typeof micronutrientLabels];
            const unit = micronutrientUnits[key as keyof typeof micronutrientUnits];
            
            return (
              <MicronutrientProgress
                key={key}
                name={label}
                current={current}
                target={target}
                unit={unit}
                color="#3b82f6"
              />
            );
          })}
        </div>
      </div>

      {/* Macro Energy Breakdown */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          ⚖️ Macro Energy Breakdown
        </h3>
        <div className="dashboard-grid">
          {(() => {
            const p = summary.total_protein || 0;
            const f = summary.total_fat || 0;
            const c = summary.total_carbs || 0;
            const calFromProtein = p * 4;
            const calFromFat = f * 9;
            const calFromCarbs = c * 4;
            const total = Math.max(calFromProtein + calFromFat + calFromCarbs, 1);
            const pct = (n: number) => ((n / total) * 100).toFixed(0);
            return (
              <>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#10b981' }}>{pct(calFromProtein)}%</div>
                  <div className="stat-label">Protein Calories</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{calFromProtein.toFixed(0)} kcal ({p.toFixed(0)} g)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#f59e0b' }}>{pct(calFromFat)}%</div>
                  <div className="stat-label">Fat Calories</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{calFromFat.toFixed(0)} kcal ({f.toFixed(0)} g)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#8b5cf6' }}>{pct(calFromCarbs)}%</div>
                  <div className="stat-label">Carb Calories</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{calFromCarbs.toFixed(0)} kcal ({c.toFixed(0)} g)</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Recent Meals */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          🍽️ Today's Meals ({summary.meal_count || 0} items)
        </h3>
        
        {(summary.foods_logged && summary.foods_logged.length > 0) ? (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Amount</th>
                  <th>Meal</th>
                  <th>Calories</th>
                </tr>
              </thead>
              <tbody>
                {(summary.foods_logged || []).map((food, index) => (
                  <tr key={index}>
                    <td>{food.name}</td>
                    <td>{food.grams}g</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {food.meal_type === 'breakfast' && '🌅 '}
                      {food.meal_type === 'lunch' && '🌞 '}
                      {food.meal_type === 'dinner' && '🌙 '}
                      {food.meal_type === 'snack' && '🍿 '}
                      {food.meal_type}
                    </td>
                    <td>{(food.calories || 0).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            background: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
              No meals logged today
            </div>
            <a href="/" className="btn btn-primary">
              Start Logging Foods
            </a>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <div className="flex gap-3" style={{ justifyContent: 'center' }}>
          <a href="/" className="btn btn-primary">
            🔍 Search Foods
          </a>
          <a href="/log" className="btn btn-success">
            📝 Log Meal
          </a>
          <button className="btn" onClick={fetchSummary}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

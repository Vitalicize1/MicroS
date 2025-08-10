"use client";
import { useState, useEffect } from 'react';
import { postAgent, get } from '@/api/client';

interface Food {
  id: number;
  name: string;
  brand: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

interface LogEntry {
  id: number;
  food: Food;
  grams: number;
  meal_type: string;
  logged_at: string;
  calories: number;
}

export default function LogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState('100');
  const [mealType, setMealType] = useState('breakfast');

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  const fetchRecentLogs = async () => {
    try {
      // This would be a real API call in production
      const summary = await get('/summary/day?user_id=1&date=today');
      if (summary?.foods_logged) {
        setRecentLogs(summary.foods_logged.slice(0, 10));
      }
    } catch (e) {
      console.log('Could not fetch recent logs');
    }
  };

  const searchFoods = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await postAgent(1, `search ${searchQuery}`);
      setSearchResults(res.candidates || []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const selectFood = (food: Food) => {
    setSelectedFood(food);
    setSearchResults([]);
    setSearchQuery('');
  };

  const logFood = async () => {
    if (!selectedFood) return;

    setLoading(true);
    try {
      const res = await postAgent(1, `log meal: ${logGrams}g food_id=${selectedFood.id} meal_type=${mealType}`);
      
      if (res.ok) {
        setSelectedFood(null);
        setLogGrams('100');
        fetchRecentLogs(); // Refresh the recent logs
        alert(`✅ Logged ${logGrams}g of ${selectedFood.name}!`);
      } else {
        throw new Error(res.message || 'Failed to log food');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to log food');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  };

  // Auto-set meal type based on time
  useEffect(() => {
    setMealType(getCurrentMeal());
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          📝 Log Your Meals
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Search for foods and quickly log what you've eaten
        </p>
      </div>

      {/* Quick Search */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          🔍 Find Food to Log
        </h3>
        
        <div className="flex gap-2" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search for foods... (e.g., 'chicken breast', 'banana')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchFoods()}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-primary" 
            onClick={searchFoods}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div>
            <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
              Select a food to log:
            </h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {searchResults.map((food) => (
                <div 
                  key={food.id}
                  className="food-card" 
                  onClick={() => selectFood(food)}
                  style={{ padding: '12px', cursor: 'pointer' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>{food.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        {food.brand} • {food.calories} cal/100g
                      </div>
                    </div>
                    <button className="btn btn-sm btn-success">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log Selected Food */}
      {selectedFood && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid #3b82f6' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
            📊 Log: {selectedFood.name}
          </h3>
          
          <div style={{ 
            background: '#f8fafc', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px' 
          }}>
            <div className="nutrition-grid">
              <div className="nutrition-item">
                <div className="nutrition-value">{selectedFood.calories}</div>
                <div className="nutrition-label">Cal/100g</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{selectedFood.protein_g}g</div>
                <div className="nutrition-label">Protein</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{selectedFood.fat_g}g</div>
                <div className="nutrition-label">Fat</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{selectedFood.carbs_g}g</div>
                <div className="nutrition-label">Carbs</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Amount (grams):
              </label>
              <input
                type="number"
                value={logGrams}
                onChange={(e) => setLogGrams(e.target.value)}
                min="1"
                max="1000"
                placeholder="100"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Meal Type:
              </label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">🌞 Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="snack">🍿 Snack</option>
              </select>
            </div>
          </div>

          <div style={{ 
            background: '#f0f9ff', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '16px',
            fontSize: '14px',
            color: '#0369a1'
          }}>
            <strong>You're logging:</strong> {logGrams}g of {selectedFood.name} 
            ({((parseFloat(logGrams) / 100) * selectedFood.calories).toFixed(0)} calories)
          </div>

          <div className="flex gap-2">
            <button 
              className="btn" 
              onClick={() => setSelectedFood(null)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-success" 
              onClick={logFood}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Logging...' : `✅ Log ${logGrams}g`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Recent Logs */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
            🕒 Today's Logged Foods
          </h3>
          <button className="btn btn-sm" onClick={fetchRecentLogs}>
            🔄 Refresh
          </button>
        </div>

        {recentLogs.length > 0 ? (
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
              {recentLogs.map((log, index) => (
                <tr key={index}>
                  <td>{log.food.name}</td>
                  <td>{log.grams}g</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {log.meal_type === 'breakfast' && '🌅 '}
                    {log.meal_type === 'lunch' && '🌞 '}
                    {log.meal_type === 'dinner' && '🌙 '}
                    {log.meal_type === 'snack' && '🍿 '}
                    {log.meal_type}
                  </td>
                  <td>{log.calories.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#6b7280' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              No foods logged today yet
            </div>
            <div style={{ fontSize: '14px' }}>
              Start by searching for foods above!
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '24px',
        justifyContent: 'center'
      }}>
        <a href="/" className="btn btn-primary">
          🔍 Advanced Search
        </a>
        <a href="/overview" className="btn">
          📊 View Overview
        </a>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from 'react';
import { get } from '@/api/client';

interface DailyData {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  vitamin_c_mg: number;
  calcium_mg: number;
  iron_mg: number;
  meals_logged: number;
  calorie_goal_percent?: number;
  protein_goal_percent?: number;
  fat_goal_percent?: number;
  carbs_goal_percent?: number;
}

interface ProgressData {
  daily_data: DailyData[];
  summary: {
    total_days_logged: number;
    avg_calories: number;
    avg_protein_g: number;
    avg_fat_g: number;
    avg_carbs_g: number;
    calorie_goal_achievement_days: number;
    protein_goal_achievement_days: number;
    current_streak: number;
  };
  goals: {
    calories?: number;
    protein_g?: number;
    fat_g?: number;
    carbs_g?: number;
  };
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadProgressData();
  }, [timeRange]);

  const loadProgressData = async () => {
    try {
      const response = await get(`/progress/1?days=${timeRange}`);
      setData(response as ProgressData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple chart components (using CSS for basic visualization)
  const LineChart = ({ data: chartData, label, color, goal }: { 
    data: number[], 
    label: string, 
    color: string,
    goal?: number 
  }) => {
    const maxValue = Math.max(...chartData, goal || 0);
    const minValue = Math.min(...chartData, 0);
    const range = maxValue - minValue || 1;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color }}>
          {label}
        </h4>
        <div style={{ 
          position: 'relative', 
          height: '120px', 
          background: '#f8fafc',
          borderRadius: '8px',
          padding: '12px',
          overflow: 'hidden'
        }}>
          {/* Goal line */}
          {goal && (
            <div style={{
              position: 'absolute',
              left: '12px',
              right: '12px',
              top: `${12 + ((maxValue - goal) / range) * 96}px`,
              height: '2px',
              background: '#ef4444',
              opacity: 0.7,
              zIndex: 1
            }}>
              <div style={{
                position: 'absolute',
                right: '0',
                top: '-20px',
                fontSize: '12px',
                color: '#ef4444',
                fontWeight: '600'
              }}>
                Goal: {Math.round(goal)}
              </div>
            </div>
          )}
          
          {/* Data line */}
          <svg style={{ width: '100%', height: '100%' }}>
            <polyline
              points={chartData.map((value, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const y = ((maxValue - value) / range) * 100;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="3"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
            {/* Data points */}
            {chartData.map((value, index) => {
              const x = (index / (chartData.length - 1)) * 100;
              const y = ((maxValue - value) / range) * 100;
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={color}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, color = '#3b82f6' }: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%'
            }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color }}>
            {Math.round(percentage)}%
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading progress data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>No progress data available</div>
      </div>
    );
  }

  // Get recent days with data for charts
  const recentData = data.daily_data.filter(d => d.meals_logged > 0).slice(-14); // Last 14 days with data

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>
          📊 Your Progress
        </h1>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
            {data.summary.current_streak}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Day Streak</div>
        </div>
        
        <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
            {data.summary.total_days_logged}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Days Logged</div>
        </div>
        
        <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
            {Math.round(data.summary.avg_calories)}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Calories</div>
        </div>
        
        <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>
            {Math.round(data.summary.avg_protein_g)}g
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Protein</div>
        </div>
      </div>

      {/* Goal Achievement Rings */}
      {data.goals.calories && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            🎯 Goal Achievement (Last 30 Days)
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing 
                percentage={(data.summary.calorie_goal_achievement_days / data.summary.total_days_logged) * 100} 
                color="#059669"
              />
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>
                Calorie Goals Met
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {data.summary.calorie_goal_achievement_days} of {data.summary.total_days_logged} days
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <ProgressRing 
                percentage={(data.summary.protein_goal_achievement_days / data.summary.total_days_logged) * 100} 
                color="#dc2626"
              />
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>
                Protein Goals Met
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {data.summary.protein_goal_achievement_days} of {data.summary.total_days_logged} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Charts */}
      {recentData.length > 1 && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            📈 Nutrition Trends (Last 14 Days)
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <LineChart
              data={recentData.map(d => d.calories)}
              label="Daily Calories"
              color="#059669"
              goal={data.goals.calories}
            />
            
            <LineChart
              data={recentData.map(d => d.protein_g)}
              label="Daily Protein (g)"
              color="#dc2626"
              goal={data.goals.protein_g}
            />
            
            <LineChart
              data={recentData.map(d => d.fat_g)}
              label="Daily Fat (g)"
              color="#d97706"
              goal={data.goals.fat_g}
            />
            
            <LineChart
              data={recentData.map(d => d.carbs_g)}
              label="Daily Carbs (g)"
              color="#2563eb"
              goal={data.goals.carbs_g}
            />
          </div>
        </div>
      )}

      {/* Recent Progress Table */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          📅 Recent Daily Progress
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Calories</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Protein</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Fat</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Carbs</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>Meals</th>
              </tr>
            </thead>
            <tbody>
              {data.daily_data.slice(-10).reverse().map((day, index) => (
                <tr key={day.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <span style={{ 
                      color: day.calorie_goal_percent && day.calorie_goal_percent >= 90 ? '#059669' : '#6b7280' 
                    }}>
                      {Math.round(day.calories)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <span style={{ 
                      color: day.protein_goal_percent && day.protein_goal_percent >= 90 ? '#059669' : '#6b7280' 
                    }}>
                      {Math.round(day.protein_g)}g
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {Math.round(day.fat_g)}g
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {Math.round(day.carbs_g)}g
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: day.meals_logged > 0 ? '#dcfce7' : '#f3f4f6',
                      color: day.meals_logged > 0 ? '#166534' : '#6b7280'
                    }}>
                      {day.meals_logged}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentData.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Start logging meals to see your progress!
          </div>
          <div style={{ fontSize: '14px' }}>
            Your nutrition trends and goal achievement will appear here once you begin tracking.
          </div>
        </div>
      )}
    </div>
  );
}

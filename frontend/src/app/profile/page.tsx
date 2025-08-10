"use client";
import { useState, useEffect } from 'react';
import { post, get, getUserId } from '@/api/client';

interface Profile {
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  activity_level?: string;
  goal_type?: string;
}

interface ProfileDisplay {
  age?: number;
  weight_lbs?: number;
  height_ft?: number;
  height_in?: number;
  gender?: string;
  activity_level?: string;
  goal_type?: string;
}

interface Goals {
  calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  vitamin_c_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [displayProfile, setDisplayProfile] = useState<ProfileDisplay>({});
  const [goals, setGoals] = useState<Goals>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Conversion functions
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs: number) => lbs / 2.20462;
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  const feetInchesToCm = (feet: number, inches: number) => {
    return (feet * 12 + inches) * 2.54;
  };

  useEffect(() => {
    loadProfile();
    // Merge prefill data from registration (one-time)
    try {
      const prefillRaw = localStorage.getItem('profile_prefill');
      if (prefillRaw) {
        const prefill = JSON.parse(prefillRaw);
        const merged: any = {};
        ['age','gender','activity_level','goal_type'].forEach((k)=>{
          if (prefill[k] != null) merged[k] = prefill[k];
        });
        if (prefill.weight_kg != null) merged.weight_kg = prefill.weight_kg;
        if (prefill.height_cm != null) merged.height_cm = prefill.height_cm;
        if (Object.keys(merged).length) {
          setProfile((p)=>({ ...p, ...merged }));
          // Also apply to display model
          setDisplayProfile((d)=>({ ...d,
            age: merged.age ?? d.age,
            gender: merged.gender ?? d.gender,
            activity_level: merged.activity_level ?? d.activity_level,
            goal_type: merged.goal_type ?? d.goal_type,
          }));
        }
        localStorage.removeItem('profile_prefill');
      }
    } catch {}
  }, []);

  const loadProfile = async () => {
    try {
      const uid = getUserId() || 1;
      const response = await get(`/profile/${uid}`);
      const profileData = response.profile || {};
      setProfile(profileData);
      setGoals(response.goals || {});
      
      // Convert to display units
      const displayData: ProfileDisplay = {
        age: profileData.age,
        gender: profileData.gender,
        activity_level: profileData.activity_level,
        goal_type: profileData.goal_type,
      };
      
      if (profileData.weight_kg) {
        displayData.weight_lbs = kgToLbs(profileData.weight_kg);
      }
      
      if (profileData.height_cm) {
        const { feet, inches } = cmToFeetInches(profileData.height_cm);
        displayData.height_ft = feet;
        displayData.height_in = inches;
      }
      
      setDisplayProfile(displayData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      // Convert display units back to metric for API
      const profileToSave: Profile = {
        age: displayProfile.age,
        gender: displayProfile.gender,
        activity_level: displayProfile.activity_level,
        goal_type: displayProfile.goal_type,
      };
      
      if (displayProfile.weight_lbs) {
        profileToSave.weight_kg = lbsToKg(displayProfile.weight_lbs);
      }
      
      if (displayProfile.height_ft !== undefined && displayProfile.height_in !== undefined) {
        profileToSave.height_cm = feetInchesToCm(displayProfile.height_ft, displayProfile.height_in);
      }
      
      const uid = getUserId() || 1;
      const response = await post(`/profile/${uid}`, { profile: profileToSave, goals });
      setMessage('Profile updated successfully! Goals recalculated.');
      
      // Reload to get updated goals
      await loadProfile();
    } catch (error: any) {
      setMessage('Error saving profile: ' + (error?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
        👤 Your Profile & Goals
      </h1>

      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: message.includes('Error') ? '#fef2f2' : '#f0f9ff',
          border: message.includes('Error') ? '1px solid #fecaca' : '1px solid #bae6fd',
          color: message.includes('Error') ? '#dc2626' : '#0369a1'
        }}>
          {message}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Personal Info */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            📊 Personal Information
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Age (years):
              </label>
              <input
                type="number"
                value={displayProfile.age || ''}
                onChange={(e) => setDisplayProfile({...displayProfile, age: parseInt(e.target.value) || undefined})}
                placeholder="e.g., 30"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Weight (lbs):
              </label>
              <input
                type="number"
                step="0.1"
                value={displayProfile.weight_lbs || ''}
                onChange={(e) => setDisplayProfile({...displayProfile, weight_lbs: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 154"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Height:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={displayProfile.height_ft || ''}
                    onChange={(e) => setDisplayProfile({...displayProfile, height_ft: parseInt(e.target.value) || undefined})}
                    placeholder="5"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>feet</div>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={displayProfile.height_in || ''}
                    onChange={(e) => setDisplayProfile({...displayProfile, height_in: parseInt(e.target.value) || undefined})}
                    placeholder="9"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>inches</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Gender:
              </label>
              <select 
                value={displayProfile.gender || ''} 
                onChange={(e) => setDisplayProfile({...displayProfile, gender: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="">Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Activity Level:
              </label>
              <select 
                value={displayProfile.activity_level || ''} 
                onChange={(e) => setDisplayProfile({...displayProfile, activity_level: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very_active">Very Active (2x/day or intense)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Goal Type:
              </label>
              <select 
                value={displayProfile.goal_type || ''} 
                onChange={(e) => setDisplayProfile({...displayProfile, goal_type: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="lose_weight">Lose Weight (-1 lb/week)</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain_weight">Gain Weight (+1 lb/week)</option>
                <option value="muscle_gain">Muscle Gain (lean bulk)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calculated Goals */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            🎯 Your Nutrition Goals
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="stat-card" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                {goals.calories ? Math.round(goals.calories) : '---'}
              </div>
              <div className="stat-label">Daily Calories</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div className="stat-card" style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626' }}>
                  {goals.protein_g ? Math.round(goals.protein_g) : '---'}g
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Protein</div>
              </div>
              
              <div className="stat-card" style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#d97706' }}>
                  {goals.fat_g ? Math.round(goals.fat_g) : '---'}g
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Fat</div>
              </div>
              
              <div className="stat-card" style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb' }}>
                  {goals.carbs_g ? Math.round(goals.carbs_g) : '---'}g
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Carbs</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Micronutrient Targets:
              </h3>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                • Vitamin C: {goals.vitamin_c_mg || 90}mg<br/>
                • Calcium: {goals.calcium_mg || 1000}mg<br/>
                • Iron: {goals.iron_mg || 18}mg<br/>
                • Fiber: {goals.fiber_g || 25}g<br/>
                • Sodium: ≤{goals.sodium_mg || 2300}mg
              </div>
            </div>

            <div style={{ 
              padding: '12px', 
              background: '#fef3c7', 
              borderRadius: '8px',
              fontSize: '12px',
              color: '#92400e'
            }}>
              💡 Goals are automatically calculated based on your profile using the Mifflin-St Jeor equation and evidence-based macro ratios.
            </div>
            
            <div style={{ 
              padding: '10px', 
              background: '#f0f9ff', 
              borderRadius: '6px',
              fontSize: '11px',
              color: '#0369a1',
              marginTop: '8px'
            }}>
              📐 Units: Enter weight in pounds (lbs) and height in feet/inches. Values are automatically converted for calculations.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button 
          className="btn btn-primary" 
          onClick={saveProfile}
          disabled={saving}
          style={{ fontSize: '16px', padding: '12px 24px' }}
        >
          {saving ? 'Saving...' : '💾 Save Profile & Calculate Goals'}
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from 'react';
import { post } from '@/api/client';
import { useRouter } from 'next/navigation';

interface OnboardingData {
  // Basic info
  username?: string;
  email?: string;
  age?: number;
  gender?: string;
  
  // Physical stats (in US units for display)
  weight_lbs?: number;
  height_ft?: number;
  height_in?: number;
  
  // Lifestyle
  activity_level?: string;
  goal_type?: string;
  
  // Custom goals (optional)
  custom_calories?: number;
  custom_protein?: number;
  custom_fat?: number;
  custom_carbs?: number;
}

interface GoalRecommendation {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  reasoning: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [recommendations, setRecommendations] = useState<GoalRecommendation | null>(null);
  const [useCustomGoals, setUseCustomGoals] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Conversion functions
  const lbsToKg = (lbs: number) => lbs / 2.20462;
  const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;

  // Calculate recommendations on the fly
  const calculateRecommendations = (): GoalRecommendation | null => {
    if (!data.age || !data.weight_lbs || !data.height_ft || !data.height_in || !data.gender || !data.activity_level || !data.goal_type) {
      return null;
    }

    // Convert to metric for calculations
    const weight_kg = lbsToKg(data.weight_lbs);
    const height_cm = feetInchesToCm(data.height_ft, data.height_in);

    // Calculate BMR using Mifflin-St Jeor
    let bmr: number;
    if (data.gender.toLowerCase() === 'male') {
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * data.age + 5;
    } else if (data.gender.toLowerCase() === 'female') {
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * data.age - 161;
    } else {
      // Average for other genders
      const bmr_male = 10 * weight_kg + 6.25 * height_cm - 5 * data.age + 5;
      const bmr_female = 10 * weight_kg + 6.25 * height_cm - 5 * data.age - 161;
      bmr = (bmr_male + bmr_female) / 2;
    }

    // Activity multipliers
    const activityMultipliers = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very_active': 1.9
    };

    const tdee = bmr * (activityMultipliers[data.activity_level as keyof typeof activityMultipliers] || 1.2);

    // Goal adjustments
    const goalAdjustments = {
      'lose_weight': -500,
      'gain_weight': 500,
      'muscle_gain': 300,
      'maintain': 0
    };

    const calories = tdee + (goalAdjustments[data.goal_type as keyof typeof goalAdjustments] || 0);

    // Macro ratios based on goal
    const macroRatios = {
      'lose_weight': { protein: 0.30, fat: 0.25, carbs: 0.45 },
      'gain_weight': { protein: 0.25, fat: 0.30, carbs: 0.45 },
      'muscle_gain': { protein: 0.30, fat: 0.25, carbs: 0.45 },
      'maintain': { protein: 0.25, fat: 0.30, carbs: 0.45 }
    };

    const ratios = macroRatios[data.goal_type as keyof typeof macroRatios] || macroRatios.maintain;

    const protein_g = (calories * ratios.protein) / 4;
    const fat_g = (calories * ratios.fat) / 9;
    const carbs_g = (calories * ratios.carbs) / 4;

    // Generate reasoning
    let reasoning = `Based on your profile (${data.age}y ${data.gender}, ${data.weight_lbs}lbs, ${data.height_ft}'${data.height_in}", ${data.activity_level} activity), `;
    reasoning += `your BMR is ~${Math.round(bmr)} calories. With ${data.activity_level} activity, you burn ~${Math.round(tdee)} calories daily. `;
    
    if (data.goal_type === 'lose_weight') {
      reasoning += `For weight loss, we recommend 500 calories below maintenance for ~1 lb/week loss.`;
    } else if (data.goal_type === 'gain_weight') {
      reasoning += `For weight gain, we recommend 500 calories above maintenance for ~1 lb/week gain.`;
    } else if (data.goal_type === 'muscle_gain') {
      reasoning += `For lean muscle gain, we recommend 300 calories above maintenance with higher protein.`;
    } else {
      reasoning += `For weight maintenance, we match your daily energy expenditure.`;
    }

    return {
      calories: Math.round(calories),
      protein_g: Math.round(protein_g),
      fat_g: Math.round(fat_g),
      carbs_g: Math.round(carbs_g),
      reasoning
    };
  };

  const handleNext = () => {
    if (step === 4) {
      const recs = calculateRecommendations();
      setRecommendations(recs);
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');

    try {
      // Convert display units to metric for backend
      const profileData = {
        username: data.username,
        email: data.email,
        age: data.age,
        gender: data.gender,
        activity_level: data.activity_level,
        goal_type: data.goal_type,
        weight_kg: data.weight_lbs ? lbsToKg(data.weight_lbs) : undefined,
        height_cm: (data.height_ft !== undefined && data.height_in !== undefined) 
          ? feetInchesToCm(data.height_ft, data.height_in) 
          : undefined,
      };

      // Use custom goals if specified, otherwise use recommendations
      const goalData = useCustomGoals && data.custom_calories ? {
        calories: data.custom_calories,
        protein_g: data.custom_protein,
        fat_g: data.custom_fat,
        carbs_g: data.custom_carbs
      } : {
        calories: recommendations?.calories,
        protein_g: recommendations?.protein_g,
        fat_g: recommendations?.fat_g,
        carbs_g: recommendations?.carbs_g
      };

      // Create user profile with goals
      await post('/profile/1', { 
        profile: profileData, 
        goals: goalData 
      });

      // Redirect to main app
      router.push('/overview');
    } catch (error: any) {
      setError(error?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
              👋 Welcome! Let's set up your profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Username:
                </label>
                <input
                  type="text"
                  value={data.username || ''}
                  onChange={(e) => setData({...data, username: e.target.value})}
                  placeholder="Your username"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => setData({...data, email: e.target.value})}
                  placeholder="your@email.com"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
              📊 Tell us about yourself
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Age:
                </label>
                <input
                  type="number"
                  value={data.age || ''}
                  onChange={(e) => setData({...data, age: parseInt(e.target.value) || undefined})}
                  placeholder="25"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Gender:
                </label>
                <select 
                  value={data.gender || ''} 
                  onChange={(e) => setData({...data, gender: e.target.value})}
                  style={{ width: '100%' }}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
              📏 Physical stats
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Weight (lbs):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={data.weight_lbs || ''}
                  onChange={(e) => setData({...data, weight_lbs: parseFloat(e.target.value) || undefined})}
                  placeholder="150"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Height:
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      value={data.height_ft || ''}
                      onChange={(e) => setData({...data, height_ft: parseInt(e.target.value) || undefined})}
                      placeholder="5"
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>feet</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      value={data.height_in || ''}
                      onChange={(e) => setData({...data, height_in: parseInt(e.target.value) || undefined})}
                      placeholder="9"
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>inches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
              🎯 Your goals
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Activity Level:
                </label>
                <select 
                  value={data.activity_level || ''} 
                  onChange={(e) => setData({...data, activity_level: e.target.value})}
                  style={{ width: '100%' }}
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (desk job, little exercise)</option>
                  <option value="light">Light (1-3 days/week exercise)</option>
                  <option value="moderate">Moderate (3-5 days/week exercise)</option>
                  <option value="active">Active (6-7 days/week exercise)</option>
                  <option value="very_active">Very Active (2x/day or intense training)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Primary Goal:
                </label>
                <select 
                  value={data.goal_type || ''} 
                  onChange={(e) => setData({...data, goal_type: e.target.value})}
                  style={{ width: '100%' }}
                >
                  <option value="">Select your goal</option>
                  <option value="lose_weight">Lose Weight (1 lb/week)</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain_weight">Gain Weight (1 lb/week)</option>
                  <option value="muscle_gain">Build Muscle (lean bulk)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
              🎯 Your Personalized Nutrition Goals
            </h2>
            
            {recommendations && (
              <div>
                <div style={{ 
                  padding: '20px', 
                  background: '#f0f9ff', 
                  borderRadius: '12px', 
                  border: '2px solid #3b82f6',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>
                    📊 Recommended Daily Targets
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                        {recommendations.calories}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Calories</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                        {recommendations.protein_g}g
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Protein</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>
                        {recommendations.fat_g}g
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Fat</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>
                        {recommendations.carbs_g}g
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Carbs</div>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#374151', 
                    lineHeight: '1.5',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    <strong>How we calculated this:</strong><br/>
                    {recommendations.reasoning}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useCustomGoals}
                      onChange={(e) => setUseCustomGoals(e.target.checked)}
                    />
                    <span style={{ fontWeight: '600' }}>I want to set custom goals</span>
                  </label>
                </div>

                {useCustomGoals && (
                  <div style={{ 
                    padding: '16px', 
                    background: '#fef3c7', 
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                      Custom Goals:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600' }}>Calories:</label>
                        <input
                          type="number"
                          value={data.custom_calories || ''}
                          onChange={(e) => setData({...data, custom_calories: parseInt(e.target.value) || undefined})}
                          placeholder={recommendations.calories.toString()}
                          style={{ width: '100%', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600' }}>Protein (g):</label>
                        <input
                          type="number"
                          value={data.custom_protein || ''}
                          onChange={(e) => setData({...data, custom_protein: parseInt(e.target.value) || undefined})}
                          placeholder={recommendations.protein_g.toString()}
                          style={{ width: '100%', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600' }}>Fat (g):</label>
                        <input
                          type="number"
                          value={data.custom_fat || ''}
                          onChange={(e) => setData({...data, custom_fat: parseInt(e.target.value) || undefined})}
                          placeholder={recommendations.fat_g.toString()}
                          style={{ width: '100%', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600' }}>Carbs (g):</label>
                        <input
                          type="number"
                          value={data.custom_carbs || ''}
                          onChange={(e) => setData({...data, custom_carbs: parseInt(e.target.value) || undefined})}
                          placeholder={recommendations.carbs_g.toString()}
                          style={{ width: '100%', fontSize: '14px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.username && data.email;
      case 2: return data.age && data.gender;
      case 3: return data.weight_lbs && data.height_ft !== undefined && data.height_in !== undefined;
      case 4: return data.activity_level && data.goal_type;
      case 5: return true;
      default: return false;
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          width: '100%', 
          height: '8px', 
          background: '#e5e7eb', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${(step / 5) * 100}%`, 
            height: '100%', 
            background: '#3b82f6',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280', 
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Step {step} of 5
        </div>
      </div>

      {/* Step content */}
      <div className="card" style={{ padding: '32px' }}>
        {renderStep()}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px',
          marginTop: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '24px' 
      }}>
        <button 
          className="btn"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0.5 : 1 }}
        >
          ← Back
        </button>
        
        {step < 5 ? (
          <button 
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canProceed()}
            style={{ opacity: canProceed() ? 1 : 0.5 }}
          >
            Next →
          </button>
        ) : (
          <button 
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={loading}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {loading ? 'Creating Profile...' : '🎉 Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}

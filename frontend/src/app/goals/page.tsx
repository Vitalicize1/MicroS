"use client";
import { useState, useEffect } from 'react';
import { get, post } from '@/api/client';

interface AdvancedGoals {
  goal_type: string;
  training_schedule: string[];
  carb_cycling_pattern: string;
  custom_protein_ratio?: number;
  custom_fat_ratio?: number;
  custom_carb_ratio?: number;
  template_name?: string;
  available_templates: string[];
}

interface GoalTemplate {
  name: string;
  display_name: string;
  description: string;
  goal_type: string;
  suitable_for: string[];
}

interface DailyGoals {
  date: string;
  goals: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
    sodium_mg: number;
  };
  metadata: {
    goal_type: string;
    training_day?: string;
    is_high_carb_day?: boolean;
  };
  cached: boolean;
}

export default function AdvancedGoalsPage() {
  const [goals, setGoals] = useState<AdvancedGoals | null>(null);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewGoals, setPreviewGoals] = useState<DailyGoals | null>(null);

  const trainingDayOptions = [
    { value: 'rest', label: '😴 Rest Day', color: 'bg-gray-100 text-gray-700' },
    { value: 'light', label: '🚶 Light Training', color: 'bg-blue-100 text-blue-700' },
    { value: 'moderate', label: '🏃 Moderate Training', color: 'bg-green-100 text-green-700' },
    { value: 'intense', label: '💪 Intense Training', color: 'bg-red-100 text-red-700' }
  ];

  const goalTypeOptions = [
    { value: 'static', label: '📊 Static Goals', description: 'Same goals every day' },
    { value: 'weekly_cycle', label: '📅 Weekly Cycle', description: 'Different goals per day of week' },
    { value: 'training_cycle', label: '🏋️ Training Cycle', description: 'Goals based on training intensity' },
    { value: 'macro_cycling', label: '🔄 Macro Cycling', description: 'High/low carb cycling' }
  ];

  const carbCyclingOptions = [
    { value: 'alternate', label: 'Alternating (High-Low-High-Low...)' },
    { value: '2high_1low', label: '2 High, 1 Low (HH-L-HH-L...)' },
    { value: '5high_2low', label: '5 High, 2 Low (Weekly cycle)' }
  ];

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [goalsResponse, templatesResponse] = await Promise.all([
        get('/advanced-goals/1'),
        get('/goal-templates')
      ]);
      
      setGoals(goalsResponse as AdvancedGoals);
      setTemplates(templatesResponse.templates || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (updates: Partial<AdvancedGoals>) => {
    try {
      await post('/advanced-goals/1', updates);
      setMessage('✅ Advanced goals updated successfully!');
      setGoals({ ...goals!, ...updates });
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error updating goals: ${error?.message || 'Unknown error'}`);
    }
  };

  const applyTemplate = async (templateName: string) => {
    try {
      const response = await post('/advanced-goals/1/apply-template', {
        template_name: templateName
      });
      
      setMessage(`✅ ${response.message}`);
      loadData(); // Reload to get updated settings
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage(`❌ Error applying template: ${error?.message || 'Unknown error'}`);
    }
  };

  const previewGoalsForDate = async () => {
    try {
      const response = await get(`/goals-for-date/1?date=${previewDate}`);
      setPreviewGoals(response as DailyGoals);
    } catch (error) {
      console.error('Error loading preview goals:', error);
    }
  };

  const updateTrainingDay = (dayIndex: number, trainingDay: string) => {
    if (!goals) return;
    
    const newSchedule = [...goals.training_schedule];
    newSchedule[dayIndex] = trainingDay;
    
    updateGoals({ training_schedule: newSchedule });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner mr-3"></div>
        <span>Loading advanced goals...</span>
      </div>
    );
  }

  if (!goals) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold mb-2">Failed to load goals</h2>
        <button onClick={loadData} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Advanced Goal Settings
        </h1>
        <p className="text-gray-600">
          Customize your nutrition goals with macro cycling, training-based adjustments, and more
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg text-center ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Quick Templates */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🚀 Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {templates.map((template) => (
            <div
              key={template.name}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{template.display_name}</h3>
                <button
                  onClick={() => applyTemplate(template.name)}
                  className="btn btn-sm btn-primary"
                >
                  Apply
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.suitable_for.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          💡 Templates provide pre-configured settings for common training styles and goals.
        </p>
      </div>

      {/* Goal Type Selection */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">🎯 Goal Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalTypeOptions.map((option) => (
            <label
              key={option.value}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                goals.goal_type === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="goal_type"
                value={option.value}
                checked={goals.goal_type === option.value}
                onChange={(e) => updateGoals({ goal_type: e.target.value })}
                className="sr-only"
              />
              <div className="font-semibold text-lg mb-1">{option.label}</div>
              <div className="text-gray-600 text-sm">{option.description}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Training Schedule (Weekly Cycle) */}
      {goals.goal_type === 'weekly_cycle' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">📅 Weekly Training Schedule</h2>
          <p className="text-gray-600 mb-4">
            Set your training intensity for each day of the week. Your nutrition goals will adjust accordingly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {dayNames.map((day, index) => (
              <div key={day} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {day}
                </label>
                <select
                  value={goals.training_schedule[index] || 'moderate'}
                  onChange={(e) => updateTrainingDay(index, e.target.value)}
                  className="w-full text-sm"
                >
                  {trainingDayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div
                  className={`text-xs px-2 py-1 rounded text-center ${
                    trainingDayOptions.find(opt => opt.value === goals.training_schedule[index])?.color || 'bg-gray-100'
                  }`}
                >
                  {trainingDayOptions.find(opt => opt.value === goals.training_schedule[index])?.label || 'Moderate'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carb Cycling Settings */}
      {goals.goal_type === 'macro_cycling' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">🔄 Carb Cycling Pattern</h2>
          <p className="text-gray-600 mb-4">
            Choose how you want to cycle between high and low carb days.
          </p>
          <div className="space-y-3">
            {carbCyclingOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  goals.carb_cycling_pattern === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="carb_cycling_pattern"
                  value={option.value}
                  checked={goals.carb_cycling_pattern === option.value}
                  onChange={(e) => updateGoals({ carb_cycling_pattern: e.target.value })}
                  className="mr-3"
                />
                <span className="font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Custom Macro Ratios */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">⚖️ Custom Macro Ratios</h2>
        <p className="text-gray-600 mb-4">
          Override default macro ratios with custom percentages. Leave empty to use template defaults.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Protein %
            </label>
            <input
              type="number"
              min="10"
              max="60"
              step="5"
              value={goals.custom_protein_ratio ? (goals.custom_protein_ratio * 100) : ''}
              onChange={(e) => updateGoals({ 
                custom_protein_ratio: e.target.value ? parseFloat(e.target.value) / 100 : undefined 
              })}
              placeholder="25"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fat %
            </label>
            <input
              type="number"
              min="15"
              max="70"
              step="5"
              value={goals.custom_fat_ratio ? (goals.custom_fat_ratio * 100) : ''}
              onChange={(e) => updateGoals({ 
                custom_fat_ratio: e.target.value ? parseFloat(e.target.value) / 100 : undefined 
              })}
              placeholder="30"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carbs %
            </label>
            <input
              type="number"
              min="5"
              max="70"
              step="5"
              value={goals.custom_carb_ratio ? (goals.custom_carb_ratio * 100) : ''}
              onChange={(e) => updateGoals({ 
                custom_carb_ratio: e.target.value ? parseFloat(e.target.value) / 100 : undefined 
              })}
              placeholder="45"
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> Make sure your percentages add up to 100%. 
            Common ratios: Balanced (25/30/45), High Protein (35/25/40), Keto (20/75/5)
          </p>
        </div>
      </div>

      {/* Goal Preview */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">👁️ Goal Preview</h2>
        <p className="text-gray-600 mb-4">
          Preview your nutrition goals for any specific date to see how your advanced settings work.
        </p>
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview Date
            </label>
            <input
              type="date"
              value={previewDate}
              onChange={(e) => setPreviewDate(e.target.value)}
              className="w-full"
            />
          </div>
          <button
            onClick={previewGoalsForDate}
            className="btn btn-primary"
          >
            Preview Goals
          </button>
        </div>

        {previewGoals && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                Goals for {new Date(previewGoals.date).toLocaleDateString()}
              </h3>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  previewGoals.cached ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {previewGoals.cached ? 'Cached' : 'Live'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {previewGoals.metadata.goal_type}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(previewGoals.goals.calories)}
                </div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-red-600">
                  {Math.round(previewGoals.goals.protein_g)}g
                </div>
                <div className="text-sm text-gray-600">Protein</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-yellow-600">
                  {Math.round(previewGoals.goals.fat_g)}g
                </div>
                <div className="text-sm text-gray-600">Fat</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(previewGoals.goals.carbs_g)}g
                </div>
                <div className="text-sm text-gray-600">Carbs</div>
              </div>
            </div>

            {previewGoals.metadata.training_day && (
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="text-sm text-gray-600">Training Day:</div>
                <div className="font-medium capitalize">
                  {previewGoals.metadata.training_day} Training
                </div>
              </div>
            )}

            {previewGoals.metadata.is_high_carb_day !== null && (
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="text-sm text-gray-600">Carb Cycling:</div>
                <div className="font-medium">
                  {previewGoals.metadata.is_high_carb_day ? '🔥 High Carb Day' : '🥬 Low Carb Day'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Template */}
      {goals.template_name && (
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-2 text-blue-900">
            📋 Current Template: {goals.template_name}
          </h2>
          <p className="text-blue-700">
            Your goals are currently based on the "{goals.template_name}" template. 
            You can still customize individual settings above.
          </p>
        </div>
      )}
    </div>
  );
}

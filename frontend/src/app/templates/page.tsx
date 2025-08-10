"use client";
import { useState, useEffect } from 'react';
import { get, post } from '@/api/client';

interface MealTemplate {
  id: number;
  name: string;
  description: string;
  total_nutrition: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  meals: {
    [mealType: string]: Array<{
      food_name: string;
      brand: string;
      grams: number;
      nutrition: {
        calories: number;
        protein_g: number;
        fat_g: number;
        carbs_g: number;
      };
    }>;
  };
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<MealTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await get('/meal-templates/1');
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId: number) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Tomorrow
      
      const response = await post(`/meal-templates/${templateId}/apply/1`, {
        target_date: targetDate.toISOString()
      });
      
      setMessage(`✅ Template applied! Meal plan created for ${targetDate.toLocaleDateString()}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error applying template: ${error?.message || 'Unknown error'}`);
    }
  };

  const deleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001'}/meal-templates/${templateId}/1`, {
        method: 'DELETE'
      });
      
      setMessage('✅ Template deleted successfully');
      setSelectedTemplate(null);
      loadTemplates();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error deleting template: ${error?.message || 'Unknown error'}`);
    }
  };

  const createQuickTemplate = async () => {
    if (!newTemplateName.trim()) return;

    try {
      // Create a sample template with common foods
      const templateData = {
        name: newTemplateName,
        description: newTemplateDescription,
        target_calories: 2000,
        target_protein_g: 150,
        target_fat_g: 67,
        target_carbs_g: 250,
        meals: {
          breakfast: [
            { food_id: 1, grams: 100, notes: 'Morning protein' },
            { food_id: 2, grams: 50, notes: 'Healthy carbs' }
          ],
          lunch: [
            { food_id: 3, grams: 150, notes: 'Midday fuel' }
          ],
          dinner: [
            { food_id: 1, grams: 120, notes: 'Evening protein' },
            { food_id: 4, grams: 80, notes: 'Vegetables' }
          ]
        }
      };

      await post('/meal-templates/1', templateData);
      
      setMessage('✅ Template created successfully');
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      loadTemplates();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error creating template: ${error?.message || 'Unknown error'}`);
    }
  };

  const getMealTypeEmoji = (mealType: string) => {
    const emojis: { [key: string]: string } = {
      breakfast: '🌅',
      lunch: '🌞',
      dinner: '🌙',
      snack: '🍎'
    };
    return emojis[mealType] || '🍽️';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading meal templates...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>
          📋 Meal Plan Templates
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Template
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: message.includes('✅') ? '#f0f9ff' : '#fef2f2',
          border: message.includes('✅') ? '1px solid #bae6fd' : '1px solid #fecaca',
          color: message.includes('✅') ? '#0369a1' : '#dc2626'
        }}>
          {message}
        </div>
      )}

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {templates.map(template => (
          <div key={template.id} className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {template.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                {template.description}
              </p>
              
              {/* Nutrition Summary */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                    {Math.round(template.total_nutrition.calories)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>cal</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                    {Math.round(template.total_nutrition.protein_g)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>protein</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#d97706' }}>
                    {Math.round(template.total_nutrition.fat_g)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>fat</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#2563eb' }}>
                    {Math.round(template.total_nutrition.carbs_g)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>carbs</div>
                </div>
              </div>

              {/* Meal Types */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Meals included:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.keys(template.meals).map(mealType => (
                    <span key={mealType} style={{
                      padding: '4px 8px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {getMealTypeEmoji(mealType)} {mealType} ({template.meals[mealType].length})
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => applyTemplate(template.id)}
                  style={{ flex: 1 }}
                >
                  📅 Apply to Tomorrow
                </button>
                <button 
                  className="btn"
                  onClick={() => setSelectedTemplate(template)}
                  style={{ padding: '8px 12px' }}
                >
                  👁️ View
                </button>
                <button 
                  className="btn"
                  onClick={() => deleteTemplate(template.id)}
                  style={{ padding: '8px 12px', color: '#dc2626' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No meal templates yet
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px' }}>
            Create templates from your favorite meal plans to reuse them quickly!
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Your First Template
          </button>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              📋 Create New Template
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Template Name:
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., High Protein Day, Keto Monday"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description (optional):
              </label>
              <textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Describe this meal plan..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{
              padding: '12px',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#92400e'
            }}>
              💡 <strong>Note:</strong> This creates a sample template. In a full implementation, you would select specific foods and portions for each meal type.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTemplateName('');
                  setNewTemplateDescription('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createQuickTemplate}
                disabled={!newTemplateName.trim()}
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>
                  {selectedTemplate.name}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedTemplate.description}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTemplate(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Detailed meal breakdown */}
            {Object.entries(selectedTemplate.meals).map(([mealType, items]) => (
              <div key={mealType} style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {getMealTypeEmoji(mealType)}
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </h3>
                
                <div style={{ paddingLeft: '16px' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < items.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{item.food_name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {item.brand} • {item.grams}g
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{Math.round(item.nutrition.calories)} cal</div>
                        <div style={{ color: '#6b7280' }}>
                          {Math.round(item.nutrition.protein_g)}p • {Math.round(item.nutrition.fat_g)}f • {Math.round(item.nutrition.carbs_g)}c
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  applyTemplate(selectedTemplate.id);
                  setSelectedTemplate(null);
                }}
              >
                📅 Apply Template
              </button>
              <button 
                className="btn"
                onClick={() => setSelectedTemplate(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

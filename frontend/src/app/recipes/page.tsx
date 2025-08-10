"use client";
import { useState, useEffect } from 'react';
import { get, post, postAgent } from '@/api/client';

interface Recipe {
  id: number;
  name: string;
  description: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions: string;
  nutrition_per_serving: {
    calories?: number;
    protein_g?: number;
    fat_g?: number;
    carbs_g?: number;
    vitamin_c_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
  };
  ingredients: Array<{
    food_name: string;
    brand: string;
    grams: number;
    notes: string;
    food_id: number;
  }>;
  created_at: string;
}

interface Ingredient {
  food_id: number;
  food_name: string;
  brand: string;
  grams: number;
  notes: string;
  nutrition?: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [message, setMessage] = useState('');

  // New recipe form
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState<number | undefined>();
  const [cookTime, setCookTime] = useState<number | undefined>();
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Ingredient search
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await get('/recipes/1');
      setRecipes(response.recipes || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchIngredients = async () => {
    if (!ingredientSearch.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await postAgent(1, `search ${ingredientSearch}`);
      setSearchResults(response.candidates || []);
    } catch (error) {
      console.error('Error searching ingredients:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addIngredient = (food: any) => {
    const newIngredient: Ingredient = {
      food_id: Math.abs(food.id), // Handle negative USDA IDs
      food_name: food.name,
      brand: food.brand || 'Generic',
      grams: 100, // Default amount
      notes: '',
      nutrition: {
        calories: food.calories || 0,
        protein_g: food.protein_g || 0,
        fat_g: food.fat_g || 0,
        carbs_g: food.carbs_g || 0
      }
    };
    
    setIngredients([...ingredients, newIngredient]);
    setIngredientSearch('');
    setSearchResults([]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    (updated[index] as any)[field] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const calculateTotalNutrition = () => {
    const totals = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
    
    ingredients.forEach(ingredient => {
      if (ingredient.nutrition) {
        const multiplier = ingredient.grams / 100;
        totals.calories += ingredient.nutrition.calories * multiplier;
        totals.protein_g += ingredient.nutrition.protein_g * multiplier;
        totals.fat_g += ingredient.nutrition.fat_g * multiplier;
        totals.carbs_g += ingredient.nutrition.carbs_g * multiplier;
      }
    });
    
    return {
      total: totals,
      per_serving: {
        calories: totals.calories / servings,
        protein_g: totals.protein_g / servings,
        fat_g: totals.fat_g / servings,
        carbs_g: totals.carbs_g / servings
      }
    };
  };

  const createRecipe = async () => {
    if (!recipeName.trim() || ingredients.length === 0) {
      setMessage('❌ Please provide a recipe name and at least one ingredient');
      return;
    }

    try {
      const recipeData = {
        name: recipeName,
        description: recipeDescription,
        servings,
        prep_time_minutes: prepTime,
        cook_time_minutes: cookTime,
        instructions,
        ingredients: ingredients.map(ing => ({
          food_id: ing.food_id,
          grams: ing.grams,
          notes: ing.notes
        }))
      };

      await post('/recipes/1', recipeData);
      
      setMessage('✅ Recipe created successfully!');
      resetForm();
      setShowCreateModal(false);
      loadRecipes();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error creating recipe: ${error?.message || 'Unknown error'}`);
    }
  };

  const convertToFood = async (recipeId: number) => {
    try {
      const response = await post(`/recipes/${recipeId}/to-food/1`, {});
      setMessage(`✅ Recipe converted to food! You can now search for "${response.food_name}"`);
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage(`❌ Error converting recipe: ${error?.message || 'Unknown error'}`);
    }
  };

  const deleteRecipe = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001'}/recipes/${recipeId}/1`, {
        method: 'DELETE'
      });
      
      setMessage('✅ Recipe deleted successfully');
      setSelectedRecipe(null);
      loadRecipes();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error deleting recipe: ${error?.message || 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setRecipeName('');
    setRecipeDescription('');
    setServings(4);
    setPrepTime(undefined);
    setCookTime(undefined);
    setInstructions('');
    setIngredients([]);
    setIngredientSearch('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading recipes...</div>
      </div>
    );
  }

  const nutrition = calculateTotalNutrition();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>
          🍳 Recipe Builder
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Recipe
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

      {/* Recipes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {recipes.map(recipe => (
          <div key={recipe.id} className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {recipe.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                {recipe.description}
              </p>
              
              {/* Recipe Info */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
                <span>🍽️ {recipe.servings} servings</span>
                {recipe.prep_time_minutes && <span>⏱️ {recipe.prep_time_minutes}min prep</span>}
                {recipe.cook_time_minutes && <span>🔥 {recipe.cook_time_minutes}min cook</span>}
              </div>
              
              {/* Nutrition per serving */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                    {Math.round(recipe.nutrition_per_serving.calories || 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>cal/serving</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                    {Math.round(recipe.nutrition_per_serving.protein_g || 0)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>protein</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#d97706' }}>
                    {Math.round(recipe.nutrition_per_serving.fat_g || 0)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>fat</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#2563eb' }}>
                    {Math.round(recipe.nutrition_per_serving.carbs_g || 0)}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>carbs</div>
                </div>
              </div>

              {/* Ingredients preview */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Ingredients ({recipe.ingredients.length}):
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {recipe.ingredients.slice(0, 3).map(ing => ing.food_name).join(', ')}
                  {recipe.ingredients.length > 3 && ` and ${recipe.ingredients.length - 3} more`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => convertToFood(recipe.id)}
                  style={{ flex: 1 }}
                >
                  🔄 Make Searchable
                </button>
                <button 
                  className="btn"
                  onClick={() => setSelectedRecipe(recipe)}
                  style={{ padding: '8px 12px' }}
                >
                  👁️ View
                </button>
                <button 
                  className="btn"
                  onClick={() => deleteRecipe(recipe.id)}
                  style={{ padding: '8px 12px', color: '#dc2626' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍳</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No recipes yet
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px' }}>
            Create custom recipes with automatic nutrition calculation!
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Your First Recipe
          </button>
        </div>
      )}

      {/* Create Recipe Modal */}
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
            maxWidth: '800px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              🍳 Create New Recipe
            </h2>
            
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Recipe Name:
                </label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g., Protein Smoothie Bowl"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Servings:
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description:
              </label>
              <input
                type="text"
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
                placeholder="Brief description of your recipe"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Prep Time (minutes):
                </label>
                <input
                  type="number"
                  value={prepTime || ''}
                  onChange={(e) => setPrepTime(parseInt(e.target.value) || undefined)}
                  placeholder="15"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Cook Time (minutes):
                </label>
                <input
                  type="number"
                  value={cookTime || ''}
                  onChange={(e) => setCookTime(parseInt(e.target.value) || undefined)}
                  placeholder="30"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                🥘 Ingredients
              </h3>
              
              {/* Add Ingredient */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder="Search for ingredients..."
                  style={{ flex: 1 }}
                  onKeyPress={(e) => e.key === 'Enter' && searchIngredients()}
                />
                <button 
                  className="btn btn-primary"
                  onClick={searchIngredients}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ 
                  maxHeight: '200px', 
                  overflow: 'auto', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  {searchResults.slice(0, 5).map((food, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => addIngredient(food)}
                    >
                      <div style={{ fontWeight: '500' }}>{food.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {food.brand} • {food.calories || 0} cal/100g
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Ingredients */}
              {ingredients.map((ingredient, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {ingredient.food_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {ingredient.brand}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={ingredient.grams}
                    onChange={(e) => updateIngredient(index, 'grams', parseFloat(e.target.value) || 0)}
                    style={{ width: '80px' }}
                    min="0"
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>g</span>
                  <input
                    type="text"
                    value={ingredient.notes}
                    onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                    placeholder="notes"
                    style={{ width: '100px' }}
                  />
                  <button 
                    onClick={() => removeIngredient(index)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#dc2626', 
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {ingredients.length > 0 && (
                <div style={{ 
                  padding: '12px', 
                  background: '#f0f9ff', 
                  borderRadius: '8px',
                  marginTop: '12px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Nutrition per serving:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#059669' }}>
                        {Math.round(nutrition.per_serving.calories)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>calories</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#dc2626' }}>
                        {Math.round(nutrition.per_serving.protein_g)}g
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>protein</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#d97706' }}>
                        {Math.round(nutrition.per_serving.fat_g)}g
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>fat</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#2563eb' }}>
                        {Math.round(nutrition.per_serving.carbs_g)}g
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>carbs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Instructions:
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step cooking instructions..."
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createRecipe}
                disabled={!recipeName.trim() || ingredients.length === 0}
              >
                Create Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
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
                  {selectedRecipe.name}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedRecipe.description}
                </p>
              </div>
              <button 
                onClick={() => setSelectedRecipe(null)}
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

            {/* Recipe details */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                📋 Ingredients:
              </h3>
              {selectedRecipe.ingredients.map((ingredient, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < selectedRecipe.ingredients.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{ingredient.food_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {ingredient.brand} {ingredient.notes && `• ${ingredient.notes}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{ingredient.grams}g</div>
                </div>
              ))}
            </div>

            {selectedRecipe.instructions && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  🍳 Instructions:
                </h3>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '14px', 
                  lineHeight: '1.5',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px'
                }}>
                  {selectedRecipe.instructions}
                </div>
              </div>
            )}

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
                  convertToFood(selectedRecipe.id);
                  setSelectedRecipe(null);
                }}
              >
                🔄 Make Searchable
              </button>
              <button 
                className="btn"
                onClick={() => setSelectedRecipe(null)}
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

"use client";
import { useState } from 'react';
import { postAgent, post } from '@/api/client';

interface Food {
  id: number;
  name: string;
  brand: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  vitamin_c_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  source?: string;
}

interface MicronutrientBarProps {
  label: string;
  value: number;
  dailyValue: number;
  unit: string;
}

function MicronutrientBar({ label, value, dailyValue, unit }: MicronutrientBarProps) {
  const percentage = Math.min((value / dailyValue) * 100, 100);
  
  return (
    <div className="micro-bar-container">
      <div className="micro-bar-label">
        <span className="font-medium">{label}</span>
        <span className="text-gray-600">{value.toFixed(1)}{unit} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="micro-bar">
        <div 
          className="micro-bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function MobileSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState(100);
  const [mealType, setMealType] = useState('breakfast');
  const [message, setMessage] = useState('');

  // Quick search suggestions
  const quickSearches = [
    { emoji: '🍎', term: 'apple', color: 'bg-red-50 text-red-600' },
    { emoji: '🥗', term: 'salad', color: 'bg-green-50 text-green-600' },
    { emoji: '🍗', term: 'chicken', color: 'bg-yellow-50 text-yellow-600' },
    { emoji: '🥛', term: 'milk', color: 'bg-blue-50 text-blue-600' },
    { emoji: '🍌', term: 'banana', color: 'bg-yellow-50 text-yellow-700' },
    { emoji: '🥕', term: 'carrot', color: 'bg-orange-50 text-orange-600' }
  ];

  const searchFoods = async (term: string = searchTerm) => {
    if (!term.trim()) return;
    
    setLoading(true);
    try {
      const response = await postAgent(1, `search ${term}`);
      setSearchResults(response.candidates || []);
    } catch (error) {
      console.error('Search error:', error);
      setMessage('❌ Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logFood = async () => {
    if (!selectedFood) return;
    
    try {
      await postAgent(1, `log meal: ${selectedFood.name} ${logGrams}g for ${mealType}`);
      setMessage(`✅ Logged ${logGrams}g of ${selectedFood.name} for ${mealType}`);
      setSelectedFood(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Log error:', error);
      setMessage('❌ Failed to log food');
    }
  };

  const quickSearch = (term: string) => {
    setSearchTerm(term);
    searchFoods(term);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          🔍 Food Search
        </h2>
        <p className="text-gray-600 text-sm md:text-base">
          Search from thousands of foods and track your nutrition
        </p>
      </div>

      {/* Search Input */}
      <div className="search-container">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchFoods()}
            placeholder="Search for foods..."
            className="search-input flex-1"
          />
          <button 
            onClick={() => searchFoods()}
            disabled={loading || !searchTerm.trim()}
            className="btn btn-primary px-6"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              '🔍'
            )}
          </button>
        </div>
      </div>

      {/* Quick Searches */}
      {searchResults.length === 0 && !loading && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Quick Searches
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickSearches.map((item) => (
              <button
                key={item.term}
                onClick={() => quickSearch(item.term)}
                className={`${item.color} p-3 rounded-lg text-center transition-all hover:scale-105 active:scale-95`}
              >
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-sm font-medium capitalize">{item.term}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length})
            </h3>
            <button
              onClick={() => {
                setSearchResults([]);
                setSearchTerm('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-4">
            {searchResults.map((food) => (
              <div
                key={food.id}
                className="food-card"
                onClick={() => setSelectedFood(food)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="food-title">{food.name}</h4>
                    <p className="food-brand">
                      {food.brand} {food.source === 'usda' && '(USDA)'}
                    </p>
                  </div>
                  <button className="btn btn-sm btn-primary ml-2">
                    Select
                  </button>
                </div>

                <div className="nutrition-grid mb-4">
                  <div className="nutrition-item">
                    <span className="nutrition-value text-green-600">{food.calories || 0}</span>
                    <span className="nutrition-label">cal</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-red-600">{(food.protein_g || 0).toFixed(1)}g</span>
                    <span className="nutrition-label">protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-yellow-600">{(food.fat_g || 0).toFixed(1)}g</span>
                    <span className="nutrition-label">fat</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-blue-600">{(food.carbs_g || 0).toFixed(1)}g</span>
                    <span className="nutrition-label">carbs</span>
                  </div>
                </div>

                {/* Micronutrient bars for mobile */}
                <div className="space-y-2">
                  <MicronutrientBar 
                    label="Vitamin C" 
                    value={food.vitamin_c_mg || 0} 
                    dailyValue={90} 
                    unit="mg" 
                  />
                  <MicronutrientBar 
                    label="Calcium" 
                    value={food.calcium_mg || 0} 
                    dailyValue={1000} 
                    unit="mg" 
                  />
                  <MicronutrientBar 
                    label="Iron" 
                    value={food.iron_mg || 0} 
                    dailyValue={18} 
                    unit="mg" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Logging Modal */}
      {selectedFood && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Log Food</h3>
              <button 
                onClick={() => setSelectedFood(null)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-lg">{selectedFood.name}</h4>
              <p className="text-gray-600">{selectedFood.brand}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (grams)
                </label>
                <input
                  type="number"
                  value={logGrams}
                  onChange={(e) => setLogGrams(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Type
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full"
                >
                  <option value="breakfast">🌅 Breakfast</option>
                  <option value="lunch">🌞 Lunch</option>
                  <option value="dinner">🌙 Dinner</option>
                  <option value="snack">🍎 Snack</option>
                </select>
              </div>

              {/* Nutrition Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Nutrition for {logGrams}g:</h5>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-value text-green-600">
                      {Math.round((selectedFood.calories || 0) * logGrams / 100)}
                    </span>
                    <span className="nutrition-label">cal</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-red-600">
                      {((selectedFood.protein_g || 0) * logGrams / 100).toFixed(1)}g
                    </span>
                    <span className="nutrition-label">protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-yellow-600">
                      {((selectedFood.fat_g || 0) * logGrams / 100).toFixed(1)}g
                    </span>
                    <span className="nutrition-label">fat</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value text-blue-600">
                      {((selectedFood.carbs_g || 0) * logGrams / 100).toFixed(1)}g
                    </span>
                    <span className="nutrition-label">carbs</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setSelectedFood(null)}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={logFood}
                  className="btn btn-primary flex-1"
                >
                  Log Food
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="spinner mx-auto mb-2"></div>
          <p className="text-gray-600">Searching foods...</p>
        </div>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && searchTerm && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No results found
          </h3>
          <p className="text-gray-600 mb-4">
            Try searching for "{searchTerm}" with different spelling or try a more general term.
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
            }}
            className="btn btn-primary"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}

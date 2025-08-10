"use client";
import { useState } from 'react';
import * as React from 'react';
import { postAgent, post, get } from '@/api/client';

interface Food {
  id: number;
  name: string;
  brand: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  completeness_score?: number;
  image_url?: string;
  source?: string;
  vitamin_c_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  vitamin_a_rae?: number;
  vitamin_d_iu?: number;
  vitamin_e_mg?: number;
  vitamin_k_mcg?: number;
  magnesium_mg?: number;
  zinc_mg?: number;
  potassium_mg?: number;
  sodium_mg?: number;
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
        <span>{label}</span>
        <span>{value.toFixed(1)}{unit} ({percentage.toFixed(0)}%)</span>
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

interface FoodCardProps {
  food: Food;
  onLog: (food: Food) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (foodId: number) => void;
}

function FoodCard({ food, onLog, isFavorite, onToggleFavorite }: FoodCardProps) {
  // Daily values for micronutrients (approximate adult values)
  const dailyValues = {
    vitamin_c_mg: 90,
    calcium_mg: 1000,
    iron_mg: 18,
    vitamin_a_rae: 900,
    vitamin_d_iu: 600,
    vitamin_e_mg: 15,
    vitamin_k_mcg: 120,
    magnesium_mg: 400,
    zinc_mg: 11,
    potassium_mg: 3500,
    sodium_mg: 2300
  };

  // Serving toggle (display only). Values are per 100g in data, scale to selected grams.
  const [displayGrams, setDisplayGrams] = React.useState<number>(100);
  const [customMode, setCustomMode] = React.useState<boolean>(false);
  const scale = (v?: number) => ((v || 0) * (displayGrams / 100));

  return (
    <div className="food-card">
      <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
        <div style={{ flex: 1 }} onClick={() => onLog(food)}>
          <div className="food-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Image / placeholder */}
            { (food as any).image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(food as any).image_url} alt={food.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6' }} />
            )}
            <span>{food.name}</span>
            {/* Provenance badge */}
            {(food as any).source && (
              <span style={{ fontSize: '10px', background: '#eef2ff', color: '#4338ca', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                {(food as any).source.toUpperCase()}
              </span>
            )}
          </div>
          <div className="food-brand">
            {food.brand || 'Generic'}
          </div>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(food.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              color: isFavorite ? '#f59e0b' : '#d1d5db'
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            ⭐
          </button>
        )}
      </div>
      
      {/* Serving toggle */}
      <div className="flex gap-2 mb-2" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>Per</span>
        {[50, 100, 150].map((g) => (
          <button
            key={g}
            className={`btn btn-sm ${displayGrams === g && !customMode ? 'btn-primary' : ''}`}
            onClick={() => { setDisplayGrams(g); setCustomMode(false); }}
          >{g}g</button>
        ))}
        <button
          className={`btn btn-sm ${customMode ? 'btn-primary' : ''}`}
          onClick={() => setCustomMode(true)}
        >Custom</button>
        {customMode && (
          <input
            type="number"
            min={1}
            max={1000}
            value={displayGrams}
            onChange={(e) => setDisplayGrams(Math.max(1, Math.min(1000, parseInt(e.target.value || '0'))))}
            style={{ width: '80px' }}
          />
        )}
      </div>

      <div className="nutrition-grid mb-3">
        <div className="nutrition-item">
          <div className="nutrition-value">{scale(food.calories).toFixed(0)}</div>
          <div className="nutrition-label">Calories</div>
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">{scale(food.protein_g).toFixed(1)}g</div>
          <div className="nutrition-label">Protein</div>
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">{scale(food.fat_g).toFixed(1)}g</div>
          <div className="nutrition-label">Fat</div>
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">{scale(food.carbs_g).toFixed(1)}g</div>
          <div className="nutrition-label">Carbs</div>
        </div>
      </div>

      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
        Micronutrients (per {displayGrams}g)
      </div>
      
      {food.vitamin_c_mg && (
        <MicronutrientBar 
          label="Vitamin C" 
          value={scale(food.vitamin_c_mg)} 
          dailyValue={dailyValues.vitamin_c_mg} 
          unit="mg" 
        />
      )}
      {food.calcium_mg && (
        <MicronutrientBar 
          label="Calcium" 
          value={scale(food.calcium_mg)} 
          dailyValue={dailyValues.calcium_mg} 
          unit="mg" 
        />
      )}
      {food.iron_mg && (
        <MicronutrientBar 
          label="Iron" 
          value={scale(food.iron_mg)} 
          dailyValue={dailyValues.iron_mg} 
          unit="mg" 
        />
      )}
      {food.vitamin_a_rae && (
        <MicronutrientBar 
          label="Vitamin A" 
          value={scale(food.vitamin_a_rae)} 
          dailyValue={dailyValues.vitamin_a_rae} 
          unit="μg" 
        />
      )}
      {food.potassium_mg && (
        <MicronutrientBar 
          label="Potassium" 
          value={scale(food.potassium_mg)} 
          dailyValue={dailyValues.potassium_mg} 
          unit="mg" 
        />
      )}
      
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <button className="btn btn-success btn-sm" onClick={() => onLog(food)}>
          + Log This Food
          {(food as any).source === 'usda' && (
            <span style={{ 
              marginLeft: '4px', 
              fontSize: '10px', 
              opacity: 0.8 
            }}>
              (USDA)
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState('100');
  const [mealType, setMealType] = useState('snack');
  
  // Search filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxCalories: '',
    minProtein: '',
    maxCarbs: '',
    maxFat: '',
    sortBy: 'relevance' // relevance, name, calories, protein
  });

  // Search mode: 'auto' (backend decides), 'generic', or 'branded'
  const [searchMode, setSearchMode] = useState<'auto' | 'generic' | 'branded'>('auto');
  const [sortByGaps, setSortByGaps] = useState<boolean>(false);
  const [dayMicros, setDayMicros] = useState<Record<string, number>>({});

  // Persist/restore searchMode and filters to localStorage
  React.useEffect(() => {
    try {
      const savedMode = localStorage.getItem('searchMode');
      if (savedMode === 'auto' || savedMode === 'generic' || savedMode === 'branded') {
        setSearchMode(savedMode as any);
      }
      const savedFilters = localStorage.getItem('searchFilters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setFilters((f) => ({ ...f, ...parsed }));
      }
      const savedGaps = localStorage.getItem('sortByGaps');
      if (savedGaps) setSortByGaps(savedGaps === 'true');
      const savedQuery = localStorage.getItem('lastSearchQuery');
      const savedData = localStorage.getItem('lastSearchData');
      if (savedQuery) setQ(savedQuery);
      if (savedData) {
        try { setData(JSON.parse(savedData)); } catch {}
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem('searchMode', searchMode); } catch {}
  }, [searchMode]);

  React.useEffect(() => {
    try { localStorage.setItem('searchFilters', JSON.stringify(filters)); } catch {}
  }, [filters]);
  React.useEffect(() => { try { localStorage.setItem('sortByGaps', String(sortByGaps)); } catch {} }, [sortByGaps]);

  // Fetch today's micronutrient totals for gap ranking
  React.useEffect(() => {
    (async () => {
      try {
        const s = await get('/summary/day?user_id=1&date=today');
        const micros = (s && s.micronutrients) || {};
        setDayMicros(micros);
      } catch {}
    })();
  }, []);

  // Search suggestions
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Debounce + in-flight request management
  const debounceRef = React.useRef<any>(null);
  const requestSeqRef = React.useRef<number>(0);

  // Common food suggestions
  const commonFoods = [
    'chicken', 'salmon', 'oats', 'spinach', 'banana', 'broccoli', 
    'rice', 'yogurt', 'almonds', 'eggs', 'avocado', 'quinoa'
  ];

  // Food categories
  const foodCategories = [
    { name: 'Protein', emoji: '🥩', searches: ['chicken', 'salmon', 'yogurt'] },
    { name: 'Vegetables', emoji: '🥬', searches: ['spinach', 'broccoli'] },
    { name: 'Fruits', emoji: '🍌', searches: ['banana'] },
    { name: 'Grains', emoji: '🌾', searches: ['oats', 'rice'] },
    { name: 'Nuts', emoji: '🥜', searches: ['almonds'] },
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<number[]>([]);

  // Load favorites on mount
  React.useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteFoods');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  const toggleFavorite = (foodId: number) => {
    const newFavorites = favorites.includes(foodId)
      ? favorites.filter(id => id !== foodId)
      : [...favorites, foodId];
    
    setFavorites(newFavorites);
    localStorage.setItem('favoriteFoods', JSON.stringify(newFavorites));
  };

  const showFavorites = async () => {
    if (favorites.length === 0) {
      setError('No favorite foods saved yet. Click the ⭐ on foods to add them to favorites!');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedCategory('Favorites');

    try {
      // Get all foods and filter by favorites
      const allFoodsResult = await Promise.all([
        postAgent(1, 'search chicken'),
        postAgent(1, 'search salmon'), 
        postAgent(1, 'search oats'),
        postAgent(1, 'search spinach'),
        postAgent(1, 'search banana'),
        postAgent(1, 'search broccoli'),
        postAgent(1, 'search rice'),
        postAgent(1, 'search yogurt'),
        postAgent(1, 'search almonds')
      ]);

      const allFoods = allFoodsResult.flatMap(res => res.candidates || []);
      const favoriteFoods = allFoods.filter(food => favorites.includes(food.id));

      setData({
        candidates: favoriteFoods,
        message: `Found ${favoriteFoods.length} favorite foods`
      });
    } catch (e: any) {
      setError(e?.message || 'Error loading favorite foods');
    } finally {
      setLoading(false);
    }
  };

  const searchCategory = async (category: string, searches: string[]) => {
    setSelectedCategory(category);
    setLoading(true);
    setError(null);
    
    try {
      // Search for all foods in this category
      const allResults = await Promise.all(
        searches.map(search => postAgent(1, `search ${search}`))
      );
      
      // Combine all candidates
      const allCandidates = allResults.flatMap(res => res.candidates || []);
      
      // Remove duplicates by ID
      const uniqueCandidates = allCandidates.filter((food, index, array) => 
        array.findIndex(f => f.id === food.id) === index
      );
      
      setData({
        candidates: uniqueCandidates,
        message: `Found ${uniqueCandidates.length} foods in ${category} category`
      });
    } catch (e: any) {
      setError(e?.message || `Error loading ${category} foods`);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => {
    if (!q.trim()) return;
    setLoading(true); 
    setError(null);
    setShowSuggestions(false);
    
    // Add to recent searches
    if (!recentSearches.includes(q.toLowerCase())) {
      const newRecent = [q.toLowerCase(), ...recentSearches.slice(0, 4)];
      setRecentSearches(newRecent);
      localStorage.setItem('recentFoodSearches', JSON.stringify(newRecent));
    }
    
    try {
      const prefix = searchMode === 'generic' ? 'search generic ' : searchMode === 'branded' ? 'search branded ' : 'search ';
      const seq = ++requestSeqRef.current;
      const res = await postAgent(1, `${prefix}${q} page=1 size=25`);
      if (seq === requestSeqRef.current) {
        setData(res);
        setPage(1);
        setHasNext(!!res?.pagination?.has_next);
      }
      try { localStorage.setItem('lastSearchQuery', q); localStorage.setItem('lastSearchData', JSON.stringify(res)); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Error searching foods');
    } finally { 
      setLoading(false); 
    }
  };

  // Debounced search on input changes and mode changes
  React.useEffect(() => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Kick off debounced search without touching recent list
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const prefix = searchMode === 'generic' ? 'search generic ' : searchMode === 'branded' ? 'search branded ' : 'search ';
          const seq = ++requestSeqRef.current;
          const res = await postAgent(1, `${prefix}${q} page=1 size=25`);
          if (seq === requestSeqRef.current) {
            setData(res);
            setPage(1);
            setHasNext(!!res?.pagination?.has_next);
          }
          try { localStorage.setItem('lastSearchQuery', q); localStorage.setItem('lastSearchData', JSON.stringify(res)); } catch {}
        } catch (e: any) {
          // Swallow errors for debounce; onSearch button still shows errors
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, searchMode]);

  // Load recent searches on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('recentFoodSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  const selectSuggestion = (suggestion: string) => {
    setQ(suggestion);
    setShowSuggestions(false);
  };

  const onKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const onLogFood = (food: Food) => {
    setSelectedFood(food);
  };

  const confirmLog = async () => {
    if (!selectedFood) return;
    
    try {
      await post('/agent', {
        user_id: 1,
        message: `log meal: ${logGrams}g food_id=${selectedFood.id} meal_type=${mealType}`
      });
      
      setSelectedFood(null);
      setLogGrams('100');
      alert(`Logged ${logGrams}g of ${selectedFood.name}!`);
    } catch (e: any) {
      alert('Error logging food: ' + (e?.message || 'Unknown error'));
    }
  };

  const candidates = data?.candidates || [];

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter((food: Food) => {
      if (filters.maxCalories && food.calories > parseInt(filters.maxCalories)) return false;
      if (filters.minProtein && food.protein_g < parseInt(filters.minProtein)) return false;
      if (filters.maxCarbs && food.carbs_g > parseInt(filters.maxCarbs)) return false;
      if (filters.maxFat && food.fat_g > parseInt(filters.maxFat)) return false;
      return true;
    })
    .sort((a: Food, b: Food) => {
      // Prefer more complete nutrient profiles when relevance is chosen
      const compA = (a as any).completeness_score || 0;
      const compB = (b as any).completeness_score || 0;
      switch (filters.sortBy) {
        case 'calories':
          return (b.calories || 0) - (a.calories || 0);
        case 'protein':
          return (b.protein_g || 0) - (a.protein_g || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'relevance':
        default:
          if (compB !== compA) return compB - compA; // higher completeness first
          return 0; // then keep backend relevance order
      }
    });

  // NOTE: server-backed pagination active; client-side chunk not needed beyond initial slice
  const displayedCandidates = filteredCandidates;

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: '700' }}>
          🔍 Search Foods
        </h2>
        <div className="search-container">
          <input 
            className="search-input"
            value={q} 
            onChange={(e) => setQ(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for foods... (e.g., 'chicken', 'banana', 'broccoli')" 
          />
          <button 
            className="btn btn-primary" 
            onClick={onSearch} 
            disabled={loading || !q.trim()}
            style={{ 
              position: 'absolute', 
              right: '60px', 
              top: '50%', 
              transform: 'translateY(-50%)' 
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button 
            className="btn" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)' 
            }}
          >
            🔧
          </button>

          {/* Search Suggestions */}
          {showSuggestions && (q.length === 0 || q.length >= 1) && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              marginTop: '4px'
            }}>
              {recentSearches.length > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                    🕒 Recent Searches
                  </div>
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <div
                      key={index}
                      onClick={() => selectSuggestion(search)}
                      style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '14px',
                        textTransform: 'capitalize'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {search}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  💡 Popular Foods
                </div>
                {commonFoods.slice(0, 6).map((food, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(food)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {food}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Filters */}
        {showFilters && (
          <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
              🔧 Search Filters
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Max Calories:
                </label>
                <input
                  type="number"
                  placeholder="e.g., 200"
                  value={filters.maxCalories}
                  onChange={(e) => setFilters({...filters, maxCalories: e.target.value})}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Min Protein (g):
                </label>
                <input
                  type="number"
                  placeholder="e.g., 10"
                  value={filters.minProtein}
                  onChange={(e) => setFilters({...filters, minProtein: e.target.value})}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Max Carbs (g):
                </label>
                <input
                  type="number"
                  placeholder="e.g., 20"
                  value={filters.maxCarbs}
                  onChange={(e) => setFilters({...filters, maxCarbs: e.target.value})}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Max Fat (g):
                </label>
                <input
                  type="number"
                  placeholder="e.g., 10"
                  value={filters.maxFat}
                  onChange={(e) => setFilters({...filters, maxFat: e.target.value})}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Sort by:
                </label>
                <select 
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  style={{ fontSize: '14px' }}
                >
                  <option value="relevance">Relevance</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="calories">Calories (High-Low)</option>
                  <option value="protein">Protein (High-Low)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button 
                className="btn btn-sm" 
                onClick={() => setFilters({
                  maxCalories: '',
                  minProtein: '',
                  maxCarbs: '',
                  maxFat: '',
                  sortBy: 'name'
                })}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Food Categories */}
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
            🗂️ Browse by Category
          </h4>
            {/* Mode toggle */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>Mode:</span>
              <div className="inline-flex" style={{ gap: '8px' }}>
                <button
                  className={`btn btn-sm ${searchMode === 'auto' ? 'btn-primary' : ''}`}
                  onClick={() => setSearchMode('auto')}
                  disabled={loading}
                >Auto</button>
                <button
                  className={`btn btn-sm ${searchMode === 'generic' ? 'btn-primary' : ''}`}
                  onClick={() => setSearchMode('generic')}
                  disabled={loading}
                >Generic</button>
                <button
                  className={`btn btn-sm ${searchMode === 'branded' ? 'btn-primary' : ''}`}
                  onClick={() => setSearchMode('branded')}
                  disabled={loading}
                >Branded</button>
              </div>
            </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {foodCategories.map((category, index) => (
              <button
                key={index}
                className={`btn ${selectedCategory === category.name ? 'btn-primary' : ''}`}
                onClick={() => searchCategory(category.name, category.searches)}
                disabled={loading}
                style={{ 
                  fontSize: '14px',
                  padding: '8px 12px'
                }}
              >
                {category.emoji} {category.name}
              </button>
            ))}
            <button
              className={`btn ${selectedCategory === 'Favorites' ? 'btn-primary' : ''}`}
              onClick={showFavorites}
              disabled={loading}
              style={{ 
                fontSize: '14px',
                padding: '8px 12px'
              }}
            >
              ⭐ Favorites {favorites.length > 0 && `(${favorites.length})`}
            </button>
            {selectedCategory && (
              <button
                className="btn"
                onClick={() => {
                  setSelectedCategory(null);
                  setData(null);
                }}
                style={{ fontSize: '14px', padding: '8px 12px' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

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

      {candidates.length > 0 && (
        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600' }}>
              {selectedCategory && (
                <span style={{ color: '#3b82f6' }}>
                  {foodCategories.find(c => c.name === selectedCategory)?.emoji} {selectedCategory}:{' '}
                </span>
              )}
              Found {candidates.length} food{candidates.length !== 1 ? 's' : ''}
              {filteredCandidates.length !== candidates.length && (
                <span style={{ color: '#6b7280', fontWeight: '400', fontSize: '16px' }}>
                  {' '}({filteredCandidates.length} after filters)
                </span>
              )}
              {data?.usda_count > 0 && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '12px', 
                  background: '#10b981', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  +USDA Database
                </span>
              )}
            </h3>
            <div style={{ textAlign: 'right' }}>
              {data?.local_count > 0 && data?.usda_count > 0 && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                  {data.local_count} local • {data.usda_count} USDA
                </div>
              )}
              {candidates.length > 1 && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Sorted by {filters.sortBy === 'name' ? 'Name' : filters.sortBy === 'calories' ? 'Calories' : filters.sortBy === 'protein' ? 'Protein' : 'Relevance'}
                </div>
              )}
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {filteredCandidates.map((food: Food) => (
              <FoodCard 
                key={food.id} 
                food={food} 
                onLog={onLogFood}
                isFavorite={favorites.includes(food.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
          {hasNext && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                className="btn"
                onClick={async () => {
                  if (loading) return;
                  try {
                    setLoading(true);
                    const prefix = searchMode === 'generic' ? 'search generic ' : searchMode === 'branded' ? 'search branded ' : 'search ';
                    const nextPage = page + 1;
                    const res = await postAgent(1, `${prefix}${q} page=${nextPage} size=25`);
                    const newItems = res?.candidates || [];
                    setData((prev: any) => ({
                      ...(prev || {}),
                      candidates: [ ...(prev?.candidates || []), ...newItems ],
                      pagination: res?.pagination || prev?.pagination,
                    }));
                    setPage(nextPage);
                    setHasNext(!!res?.pagination?.has_next);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !hasNext}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Log Food Modal */}
      {selectedFood && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Log {selectedFood.name}</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Amount (grams):
              </label>
              <input
                type="number"
                value={logGrams}
                onChange={(e) => setLogGrams(e.target.value)}
                min="1"
                max="1000"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Meal Type:
              </label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button className="btn" onClick={() => setSelectedFood(null)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={confirmLog}>
                Log Food
              </button>
            </div>
          </div>
        </div>
      )}

      {candidates.length === 0 && !loading && q && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          No foods found for "{q}". Try a different search term.
        </div>
      )}

      {candidates.length > 0 && filteredCandidates.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          No foods match your current filters. Try adjusting the filter values or{' '}
          <button 
            onClick={() => setFilters({
              maxCalories: '',
              minProtein: '',
              maxCarbs: '',
              maxFat: '',
              sortBy: 'name'
            })}
            style={{ color: '#3b82f6', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            clear all filters
          </button>.
        </div>
      )}
    </div>
  );
}

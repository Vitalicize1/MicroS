from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    prefs: Dict[str, Any] = {}
    created_at: datetime
    
    class Config:
        from_attributes = True

class FoodBase(BaseModel):
    name: str
    brand: str = "Generic"
    upc: str

class FoodCreate(FoodBase):
    # Macronutrients
    calories: float
    protein_g: float
    fat_g: float
    carbs_g: float
    
    # Fat-soluble vitamins
    vitamin_a_rae: float
    vitamin_d_iu: float
    vitamin_e_mg: float
    vitamin_k_mcg: float
    
    # Water-soluble vitamins
    vitamin_c_mg: float
    vitamin_b1_mg: float = 0.0  # Thiamin
    vitamin_b2_mg: float = 0.0  # Riboflavin
    vitamin_b3_mg: float = 0.0  # Niacin
    vitamin_b5_mg: float = 0.0  # Pantothenic Acid
    vitamin_b6_mg: float = 0.0  # Pyridoxine
    vitamin_b7_mcg: float = 0.0 # Biotin
    vitamin_b9_mcg: float = 0.0 # Folate
    vitamin_b12_mcg: float = 0.0 # Cobalamin
    choline_mg: float = 0.0     # Essential nutrient
    
    # Macrominerals
    calcium_mg: float
    phosphorus_mg: float = 0.0
    magnesium_mg: float
    sodium_mg: float
    potassium_mg: float
    chloride_mg: float = 0.0
    sulfur_mg: float = 0.0
    
    # Trace minerals
    iron_mg: float
    zinc_mg: float
    copper_mg: float = 0.0
    manganese_mg: float = 0.0
    iodine_mcg: float = 0.0
    selenium_mcg: float = 0.0
    chromium_mcg: float = 0.0
    molybdenum_mcg: float = 0.0
    fluoride_mg: float = 0.0

class Food(FoodBase):
    id: int
    # Macronutrients
    calories: float
    protein_g: float
    fat_g: float
    carbs_g: float
    
    # Fat-soluble vitamins
    vitamin_a_rae: float
    vitamin_d_iu: float
    vitamin_e_mg: float
    vitamin_k_mcg: float
    
    # Water-soluble vitamins
    vitamin_c_mg: float
    vitamin_b1_mg: float = 0.0  # Thiamin
    vitamin_b2_mg: float = 0.0  # Riboflavin
    vitamin_b3_mg: float = 0.0  # Niacin
    vitamin_b5_mg: float = 0.0  # Pantothenic Acid
    vitamin_b6_mg: float = 0.0  # Pyridoxine
    vitamin_b7_mcg: float = 0.0 # Biotin
    vitamin_b9_mcg: float = 0.0 # Folate
    vitamin_b12_mcg: float = 0.0 # Cobalamin
    choline_mg: float = 0.0     # Essential nutrient
    
    # Macrominerals
    calcium_mg: float
    phosphorus_mg: float = 0.0
    magnesium_mg: float
    sodium_mg: float
    potassium_mg: float
    chloride_mg: float = 0.0
    sulfur_mg: float = 0.0
    
    # Trace minerals
    iron_mg: float
    zinc_mg: float
    copper_mg: float = 0.0
    manganese_mg: float = 0.0
    iodine_mcg: float = 0.0
    selenium_mcg: float = 0.0
    chromium_mcg: float = 0.0
    molybdenum_mcg: float = 0.0
    fluoride_mg: float = 0.0
    
    created_at: datetime
    
    class Config:
        from_attributes = True

class MealLogBase(BaseModel):
    food_id: int
    grams: float
    meal_type: str = "snack"
    notes: Optional[str] = None

class MealLogCreate(MealLogBase):
    pass

class MealLog(BaseModel):
    id: int
    user_id: int
    food_id: int
    grams: float
    meal_type: str
    logged_at: datetime
    food_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class AgentRequest(BaseModel):
    user_id: int
    message: str

class AgentResponse(BaseModel):
    response: str
    state: Dict[str, Any]
    confidence: float = 0.0
    needs_clarification: bool = False

class NutritionTotals(BaseModel):
    # Macronutrients
    calories: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbs_g: float = 0.0
    
    # Fat-soluble vitamins
    vitamin_a_rae: float = 0.0
    vitamin_d_iu: float = 0.0
    vitamin_e_mg: float = 0.0
    vitamin_k_mcg: float = 0.0
    
    # Water-soluble vitamins
    vitamin_c_mg: float = 0.0
    vitamin_b1_mg: float = 0.0  # Thiamin
    vitamin_b2_mg: float = 0.0  # Riboflavin
    vitamin_b3_mg: float = 0.0  # Niacin
    vitamin_b5_mg: float = 0.0  # Pantothenic Acid
    vitamin_b6_mg: float = 0.0  # Pyridoxine
    vitamin_b7_mcg: float = 0.0 # Biotin
    vitamin_b9_mcg: float = 0.0 # Folate
    vitamin_b12_mcg: float = 0.0 # Cobalamin
    choline_mg: float = 0.0     # Essential nutrient
    
    # Macrominerals
    calcium_mg: float = 0.0
    phosphorus_mg: float = 0.0
    magnesium_mg: float = 0.0
    sodium_mg: float = 0.0
    potassium_mg: float = 0.0
    chloride_mg: float = 0.0
    sulfur_mg: float = 0.0
    
    # Trace minerals
    iron_mg: float = 0.0
    zinc_mg: float = 0.0
    copper_mg: float = 0.0
    manganese_mg: float = 0.0
    iodine_mcg: float = 0.0
    selenium_mcg: float = 0.0
    chromium_mcg: float = 0.0
    molybdenum_mcg: float = 0.0
    fluoride_mg: float = 0.0

# ---- Structured /agent response schemas ----
class FoodCandidate(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    upc: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    carbs_g: Optional[float] = None

class DaySummary(BaseModel):
    date: str
    meal_count: int
    totals: Dict[str, float]
    meals: List[Dict[str, Any]]

class RecommendationItem(BaseModel):
    food_id: int
    name: str
    brand: Optional[str] = None
    coverage: Dict[str, float]
    calories_per_100g: Optional[float] = None

class AgentStructuredResponse(BaseModel):
    ok: bool
    intent: Optional[str]
    message: str
    confidence: float
    needs_clarification: bool
    questions: List[str] = []
    candidates: List[FoodCandidate] = []
    selected: Optional[FoodCandidate] = None
    log_result: Optional[MealLog] = None
    day_summary: Optional[DaySummary] = None
    recommendations: List[RecommendationItem] = []
    state: Dict[str, Any] = {}

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey, Boolean, Date, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    # For authentication (hashed via werkzeug.security.generate_password_hash)
    password_hash = Column(String)
    prefs = Column(JSON, default={})  # Store goals and preferences
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Personal profile for goal calculation
    age = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    gender = Column(String)  # 'male', 'female', 'other'
    activity_level = Column(String, default='sedentary')  # sedentary, light, moderate, active, very_active
    goal_type = Column(String, default='maintain')  # lose_weight, gain_weight, maintain, muscle_gain
    
    # Custom nutrition goals (calories per day)
    goal_calories = Column(Float)
    goal_protein_g = Column(Float)
    goal_fat_g = Column(Float)
    goal_carbs_g = Column(Float)
    goal_fiber_g = Column(Float, default=25.0)
    
    # Micronutrient goals (daily values) - Based on RDA for adults
    # Fat-soluble vitamins
    goal_vitamin_a_rae = Column(Float, default=900.0)  # mcg
    goal_vitamin_d_iu = Column(Float, default=600.0)   # IU
    goal_vitamin_e_mg = Column(Float, default=15.0)    # mg
    goal_vitamin_k_mcg = Column(Float, default=120.0)  # mcg
    
    # Water-soluble vitamins
    goal_vitamin_c_mg = Column(Float, default=90.0)    # mg
    goal_vitamin_b1_mg = Column(Float, default=1.2)    # Thiamin
    goal_vitamin_b2_mg = Column(Float, default=1.3)    # Riboflavin
    goal_vitamin_b3_mg = Column(Float, default=16.0)   # Niacin
    goal_vitamin_b5_mg = Column(Float, default=5.0)    # Pantothenic Acid
    goal_vitamin_b6_mg = Column(Float, default=1.3)    # Pyridoxine
    goal_vitamin_b7_mcg = Column(Float, default=30.0)  # Biotin
    goal_vitamin_b9_mcg = Column(Float, default=400.0) # Folate
    goal_vitamin_b12_mcg = Column(Float, default=2.4)  # Cobalamin
    goal_choline_mg = Column(Float, default=550.0)     # Essential nutrient
    
    # Macrominerals
    goal_calcium_mg = Column(Float, default=1000.0)    # mg
    goal_phosphorus_mg = Column(Float, default=700.0)  # mg
    goal_magnesium_mg = Column(Float, default=400.0)   # mg
    goal_sodium_mg = Column(Float, default=2300.0)     # mg (upper limit)
    goal_potassium_mg = Column(Float, default=3500.0)  # mg
    goal_chloride_mg = Column(Float, default=2300.0)   # mg
    goal_sulfur_mg = Column(Float, default=1000.0)     # mg (estimated)
    
    # Trace minerals
    goal_iron_mg = Column(Float, default=18.0)         # mg
    goal_zinc_mg = Column(Float, default=11.0)         # mg
    goal_copper_mg = Column(Float, default=0.9)        # mg
    goal_manganese_mg = Column(Float, default=2.3)     # mg
    goal_iodine_mcg = Column(Float, default=150.0)     # mcg
    goal_selenium_mcg = Column(Float, default=55.0)    # mcg
    goal_chromium_mcg = Column(Float, default=35.0)    # mcg
    goal_molybdenum_mcg = Column(Float, default=45.0)  # mcg
    goal_fluoride_mg = Column(Float, default=4.0)      # mg
    
    # Relationships
    meal_logs = relationship("MealLog", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")

class Food(Base):
    __tablename__ = "foods"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, default="Generic")
    upc = Column(String, unique=True, index=True)
    
    # USDA integration fields
    usda_fdc_id = Column(Integer, unique=True, index=True)  # FoodData Central ID
    data_source = Column(String, default="local")  # "local", "usda"
    publication_date = Column(String)  # USDA publication date
    
    # Macronutrients per 100g
    calories = Column(Float)
    protein_g = Column(Float)
    fat_g = Column(Float)
    carbs_g = Column(Float)
    
    # Micronutrients per 100g
    # Fat-soluble vitamins
    vitamin_a_rae = Column(Float)  # Retinol Activity Equivalents (mcg)
    vitamin_d_iu = Column(Float)   # International Units
    vitamin_e_mg = Column(Float)
    vitamin_k_mcg = Column(Float)
    
    # Water-soluble vitamins
    vitamin_c_mg = Column(Float)
    vitamin_b1_mg = Column(Float)  # Thiamin
    vitamin_b2_mg = Column(Float)  # Riboflavin
    vitamin_b3_mg = Column(Float)  # Niacin
    vitamin_b5_mg = Column(Float)  # Pantothenic Acid
    vitamin_b6_mg = Column(Float)  # Pyridoxine
    vitamin_b7_mcg = Column(Float) # Biotin
    vitamin_b9_mcg = Column(Float) # Folate
    vitamin_b12_mcg = Column(Float) # Cobalamin
    choline_mg = Column(Float)     # Essential nutrient
    
    # Macrominerals
    calcium_mg = Column(Float)
    phosphorus_mg = Column(Float)
    magnesium_mg = Column(Float)
    sodium_mg = Column(Float)
    potassium_mg = Column(Float)
    chloride_mg = Column(Float)
    sulfur_mg = Column(Float)
    
    # Trace minerals
    iron_mg = Column(Float)
    zinc_mg = Column(Float)
    copper_mg = Column(Float)
    manganese_mg = Column(Float)
    iodine_mcg = Column(Float)
    selenium_mcg = Column(Float)
    chromium_mcg = Column(Float)
    molybdenum_mcg = Column(Float)
    fluoride_mg = Column(Float)
    
    # Relationships
    meal_logs = relationship("MealLog", back_populates="food")
    meal_plan_items = relationship("MealPlanItem", back_populates="food")

class MealLog(Base):
    __tablename__ = "meal_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_id = Column(Integer, ForeignKey("foods.id"))
    grams = Column(Float)
    meal_type = Column(String, default="snack")  # breakfast, lunch, dinner, snack
    logged_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="meal_logs")
    food = relationship("Food", back_populates="meal_logs")

class MealPlan(Base):
    __tablename__ = "meal_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # e.g., "Monday Meal Plan", "High Protein Day"
    description = Column(Text)
    target_date = Column(DateTime)  # Date this plan is for
    created_at = Column(DateTime, default=datetime.utcnow)
    is_template = Column(Integer, default=0)  # 1 if this is a reusable template
    
    # Target nutrition for this plan
    target_calories = Column(Float)
    target_protein_g = Column(Float)
    target_fat_g = Column(Float)
    target_carbs_g = Column(Float)
    
    # Relationships
    user = relationship("User", back_populates="meal_plans")
    items = relationship("MealPlanItem", back_populates="meal_plan", cascade="all, delete-orphan")

class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"
    
    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"))
    food_id = Column(Integer, ForeignKey("foods.id"))
    meal_type = Column(String)  # breakfast, lunch, dinner, snack
    grams = Column(Float)
    order_index = Column(Integer, default=0)  # Order within the meal type
    notes = Column(Text)
    
    # Relationships
    meal_plan = relationship("MealPlan", back_populates="items")
    food = relationship("Food", back_populates="meal_plan_items")

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    description = Column(Text)
    servings = Column(Float, default=1.0)  # Number of servings this recipe makes
    prep_time_minutes = Column(Integer)
    cook_time_minutes = Column(Integer)
    instructions = Column(Text)
    
    # Calculated nutrition per serving (auto-calculated from ingredients)
    calories_per_serving = Column(Float)
    protein_g_per_serving = Column(Float)
    fat_g_per_serving = Column(Float)
    carbs_g_per_serving = Column(Float)
    
    # Micronutrients per serving
    vitamin_c_mg_per_serving = Column(Float)
    calcium_mg_per_serving = Column(Float)
    iron_mg_per_serving = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    food_id = Column(Integer, ForeignKey("foods.id"))
    grams = Column(Float)  # Amount of this ingredient in the recipe
    notes = Column(String)  # e.g., "chopped", "diced", "cooked"
    order_index = Column(Integer, default=0)  # Order in ingredient list
    
    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    food = relationship("Food")

class AdvancedGoalSettings(Base):
    __tablename__ = "advanced_goal_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Goal type: static, weekly_cycle, training_cycle, macro_cycling, custom_schedule
    goal_type = Column(String, default="static")
    
    # Training schedule (JSON array for 7 days: rest, light, moderate, intense)
    training_schedule = Column(JSON, default=lambda: [
        "moderate", "moderate", "rest", "intense", "light", "intense", "rest"
    ])
    
    # Carb cycling pattern: alternate, 2high_1low, 5high_2low
    carb_cycling_pattern = Column(String, default="alternate")
    
    # Custom macro ratios override
    custom_protein_ratio = Column(Float)  # 0.0-1.0
    custom_fat_ratio = Column(Float)      # 0.0-1.0  
    custom_carb_ratio = Column(Float)     # 0.0-1.0
    
    # Custom schedule (JSON: date -> goals)
    custom_schedule = Column(JSON, default=lambda: {})
    
    # Template name if using a predefined template
    template_name = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")

class DailyGoalCache(Base):
    """Cache calculated goals for specific dates to improve performance"""
    __tablename__ = "daily_goal_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    goal_date = Column(Date, index=True)
    
    # Cached goal values
    calories = Column(Float)
    protein_g = Column(Float)
    fat_g = Column(Float)
    carbs_g = Column(Float)
    fiber_g = Column(Float)
    sodium_mg = Column(Float)
    
    # Goal metadata
    goal_type = Column(String)  # Which type of goal calculation was used
    training_day = Column(String)  # rest, light, moderate, intense
    is_high_carb_day = Column(Boolean)  # For carb cycling
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Unique constraint on user + date
    __table_args__ = (
        Index('ix_user_goal_date', 'user_id', 'goal_date', unique=True),
    )

class BarcodeHistory(Base):
    """Track barcode scan attempts and success rates"""
    __tablename__ = "barcode_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    upc = Column(String, index=True)
    success = Column(Boolean, default=False)
    
    # Product info if found
    product_name = Column(String)
    brand = Column(String)
    source = Column(String)  # OpenFoodFacts, UPCItemDB, etc.
    
    # Scan metadata
    scan_method = Column(String, default="manual")  # manual, camera, image_upload
    confidence_score = Column(Float)  # For ML-based barcode detection
    
    scanned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")

class UserFollow(Base):
    """User following relationships"""
    __tablename__ = "user_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))
    following_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])
    
    # Unique constraint - can't follow same user twice
    __table_args__ = (
        Index('ix_unique_follow', 'follower_id', 'following_id', unique=True),
    )

class SharedFood(Base):
    """Foods shared by users to the community"""
    __tablename__ = "shared_foods"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_id = Column(Integer, ForeignKey("foods.id"))
    
    # Share details
    caption = Column(Text)
    tags = Column(JSON, default=lambda: [])  # List of hashtags
    is_recipe = Column(Boolean, default=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    
    # Social metrics
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    food = relationship("Food")
    recipe = relationship("Recipe")
    likes = relationship("SharedFoodLike", back_populates="shared_food", cascade="all, delete-orphan")
    comments = relationship("SharedFoodComment", back_populates="shared_food", cascade="all, delete-orphan")

class SharedFoodLike(Base):
    """Likes on shared foods"""
    __tablename__ = "shared_food_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    shared_food_id = Column(Integer, ForeignKey("shared_foods.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    shared_food = relationship("SharedFood", back_populates="likes")
    
    # Unique constraint
    __table_args__ = (
        Index('ix_unique_like', 'user_id', 'shared_food_id', unique=True),
    )

class SharedFoodComment(Base):
    """Comments on shared foods"""
    __tablename__ = "shared_food_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    shared_food_id = Column(Integer, ForeignKey("shared_foods.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    shared_food = relationship("SharedFood", back_populates="comments")

class Challenge(Base):
    """Community challenges"""
    __tablename__ = "challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Challenge details
    title = Column(String, index=True)
    description = Column(Text)
    challenge_type = Column(String)  # daily_protein, weekly_steps, monthly_veggies, etc.
    target_value = Column(Float)  # Target amount (e.g., 150g protein)
    target_unit = Column(String)  # Unit (g, steps, servings, etc.)
    
    # Timeline
    start_date = Column(Date)
    end_date = Column(Date)
    
    # Challenge settings
    is_public = Column(Boolean, default=True)
    max_participants = Column(Integer)
    
    # Metrics
    participants_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")
    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")

class ChallengeParticipant(Base):
    """Users participating in challenges"""
    __tablename__ = "challenge_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Progress tracking
    current_progress = Column(Float, default=0.0)
    best_day_progress = Column(Float, default=0.0)
    days_completed = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    
    joined_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    challenge = relationship("Challenge", back_populates="participants")
    user = relationship("User")
    
    # Unique constraint
    __table_args__ = (
        Index('ix_unique_participant', 'challenge_id', 'user_id', unique=True),
    )

class ActivityFeed(Base):
    """User activity feed for social features"""
    __tablename__ = "activity_feed"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Activity details
    activity_type = Column(String)  # shared_food, completed_challenge, new_recipe, etc.
    activity_data = Column(JSON)  # Additional data specific to activity type
    
    # Related objects (nullable, depending on activity type)
    shared_food_id = Column(Integer, ForeignKey("shared_foods.id"), nullable=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    shared_food = relationship("SharedFood")
    challenge = relationship("Challenge")
    recipe = relationship("Recipe")
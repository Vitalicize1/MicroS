"""
Recipe and custom food models for the recipe builder system.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

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

class CustomFood(Base):
    """
    Custom foods created from recipes - these become searchable like regular foods
    """
    __tablename__ = "custom_foods"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    
    # This becomes a Food entry that can be logged/searched
    food_id = Column(Integer, ForeignKey("foods.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    recipe = relationship("Recipe")
    food = relationship("Food")

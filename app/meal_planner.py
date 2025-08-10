"""
Meal planning and recipe suggestion system.
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models import User, Food, MealPlan, MealPlanItem
import random

class MealPlanner:
    """Generate meal plans based on user goals and preferences."""
    
    def suggest_meal_plan(self, db: Session, user: User, target_date: datetime = None) -> Optional[MealPlan]:
        """
        Generate a meal plan suggestion based on user's nutrition goals.
        
        Args:
            db: Database session
            user: User to create plan for
            target_date: Date for the meal plan (defaults to tomorrow)
            
        Returns:
            MealPlan: Generated meal plan
        """
        if not target_date:
            target_date = datetime.now() + timedelta(days=1)
        
        # Get user's nutrition goals
        target_calories = user.goal_calories or 2000
        target_protein = user.goal_protein_g or 150
        target_fat = user.goal_fat_g or 65
        target_carbs = user.goal_carbs_g or 250
        
        # Create meal plan
        meal_plan = MealPlan(
            user_id=user.id,
            name=f"Daily Plan - {target_date.strftime('%B %d')}",
            description=f"Balanced meal plan targeting {target_calories:.0f} calories",
            target_date=target_date,
            target_calories=target_calories,
            target_protein_g=target_protein,
            target_fat_g=target_fat,
            target_carbs_g=target_carbs
        )
        db.add(meal_plan)
        db.commit()
        db.refresh(meal_plan)
        
        # Distribute calories across meals
        calorie_distribution = {
            'breakfast': 0.25,  # 25%
            'lunch': 0.35,      # 35%
            'dinner': 0.30,     # 30%
            'snack': 0.10       # 10%
        }
        
        # Get available foods
        foods = db.query(Food).limit(50).all()
        if not foods:
            return meal_plan
        
        # Generate meals for each meal type
        for meal_type, calorie_ratio in calorie_distribution.items():
            target_meal_calories = target_calories * calorie_ratio
            self._add_meal_to_plan(db, meal_plan, meal_type, target_meal_calories, foods)
        
        return meal_plan
    
    def _add_meal_to_plan(self, db: Session, meal_plan: MealPlan, meal_type: str, 
                         target_calories: float, available_foods: List[Food]):
        """Add foods to a meal plan for a specific meal type."""
        
        # Filter foods based on meal type preferences
        suitable_foods = self._filter_foods_for_meal_type(available_foods, meal_type)
        
        if not suitable_foods:
            suitable_foods = available_foods
        
        current_calories = 0
        order_index = 0
        
        # Add 1-3 foods per meal
        num_foods = random.randint(1, min(3, len(suitable_foods)))
        selected_foods = random.sample(suitable_foods, num_foods)
        
        for food in selected_foods:
            if current_calories >= target_calories:
                break
                
            # Calculate portion to get remaining calories
            remaining_calories = target_calories - current_calories
            food_calories_per_100g = food.calories or 100
            
            # Calculate grams needed (with some randomness)
            if food_calories_per_100g > 0:
                base_grams = (remaining_calories / food_calories_per_100g) * 100
                # Add some variation (80-120% of calculated amount)
                grams = base_grams * random.uniform(0.8, 1.2)
                grams = max(20, min(500, grams))  # Keep portions reasonable
            else:
                grams = 100  # Default portion
            
            # Create meal plan item
            item = MealPlanItem(
                meal_plan_id=meal_plan.id,
                food_id=food.id,
                meal_type=meal_type,
                grams=grams,
                order_index=order_index,
                notes=f"Suggested portion for {meal_type}"
            )
            db.add(item)
            
            current_calories += (food_calories_per_100g * grams / 100)
            order_index += 1
        
        db.commit()
    
    def _filter_foods_for_meal_type(self, foods: List[Food], meal_type: str) -> List[Food]:
        """Filter foods that are suitable for a specific meal type."""
        
        # Simple keyword-based filtering
        breakfast_keywords = ['oats', 'yogurt', 'banana', 'egg', 'cereal', 'toast']
        lunch_keywords = ['chicken', 'salad', 'rice', 'quinoa', 'sandwich']
        dinner_keywords = ['salmon', 'beef', 'pasta', 'potato', 'broccoli']
        snack_keywords = ['almonds', 'apple', 'cheese', 'nuts']
        
        keyword_map = {
            'breakfast': breakfast_keywords,
            'lunch': lunch_keywords,
            'dinner': dinner_keywords,
            'snack': snack_keywords
        }
        
        keywords = keyword_map.get(meal_type, [])
        if not keywords:
            return foods
        
        suitable_foods = []
        for food in foods:
            food_name = food.name.lower()
            if any(keyword in food_name for keyword in keywords):
                suitable_foods.append(food)
        
        return suitable_foods if suitable_foods else foods
    
    def get_meal_plan_nutrition(self, db: Session, meal_plan: MealPlan) -> Dict:
        """Calculate total nutrition for a meal plan."""
        
        total_nutrition = {
            'calories': 0,
            'protein_g': 0,
            'fat_g': 0,
            'carbs_g': 0,
            'vitamin_c_mg': 0,
            'calcium_mg': 0,
            'iron_mg': 0
        }
        
        for item in meal_plan.items:
            food = item.food
            multiplier = item.grams / 100.0
            
            total_nutrition['calories'] += (food.calories or 0) * multiplier
            total_nutrition['protein_g'] += (food.protein_g or 0) * multiplier
            total_nutrition['fat_g'] += (food.fat_g or 0) * multiplier
            total_nutrition['carbs_g'] += (food.carbs_g or 0) * multiplier
            total_nutrition['vitamin_c_mg'] += (food.vitamin_c_mg or 0) * multiplier
            total_nutrition['calcium_mg'] += (food.calcium_mg or 0) * multiplier
            total_nutrition['iron_mg'] += (food.iron_mg or 0) * multiplier
        
        return total_nutrition

# Global instance
meal_planner = MealPlanner()

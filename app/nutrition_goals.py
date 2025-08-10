"""
Nutrition goal calculation and management.
"""
from typing import Dict, Optional
from app.models import User

class NutritionGoalCalculator:
    """Calculate nutrition goals based on user profile."""
    
    # Activity level multipliers for BMR
    ACTIVITY_MULTIPLIERS = {
        'sedentary': 1.2,      # Little to no exercise
        'light': 1.375,       # Light exercise 1-3 days/week
        'moderate': 1.55,     # Moderate exercise 3-5 days/week
        'active': 1.725,      # Hard exercise 6-7 days/week
        'very_active': 1.9    # Very hard exercise, physical job
    }
    
    def calculate_bmr(self, user: User) -> Optional[float]:
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation."""
        if not all([user.age, user.weight_kg, user.height_cm, user.gender]):
            return None
            
        if user.gender.lower() == 'male':
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age + 5
        elif user.gender.lower() == 'female':
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age - 161
        else:
            # Use average for other genders
            bmr_male = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age + 5
            bmr_female = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age - 161
            bmr = (bmr_male + bmr_female) / 2
            
        return bmr
    
    def calculate_tdee(self, user: User) -> Optional[float]:
        """Calculate Total Daily Energy Expenditure."""
        bmr = self.calculate_bmr(user)
        if not bmr:
            return None
            
        activity_multiplier = self.ACTIVITY_MULTIPLIERS.get(user.activity_level, 1.2)
        return bmr * activity_multiplier
    
    def calculate_calorie_goal(self, user: User) -> Optional[float]:
        """Calculate daily calorie goal based on user's goal type."""
        tdee = self.calculate_tdee(user)
        if not tdee:
            return None
            
        goal_adjustments = {
            'lose_weight': -500,    # 1 lb per week
            'gain_weight': 500,     # 1 lb per week
            'muscle_gain': 300,     # Lean bulk
            'maintain': 0
        }
        
        adjustment = goal_adjustments.get(user.goal_type, 0)
        return tdee + adjustment
    
    def calculate_macro_goals(self, user: User) -> Dict[str, float]:
        """Calculate macronutrient goals based on calorie goal."""
        calorie_goal = user.goal_calories or self.calculate_calorie_goal(user)
        if not calorie_goal:
            return {}
        
        # Default macro ratios based on goal type
        macro_ratios = {
            'lose_weight': {'protein': 0.30, 'fat': 0.25, 'carbs': 0.45},
            'gain_weight': {'protein': 0.25, 'fat': 0.30, 'carbs': 0.45},
            'muscle_gain': {'protein': 0.30, 'fat': 0.25, 'carbs': 0.45},
            'maintain': {'protein': 0.25, 'fat': 0.30, 'carbs': 0.45}
        }
        
        ratios = macro_ratios.get(user.goal_type, macro_ratios['maintain'])
        
        return {
            'calories': calorie_goal,
            'protein_g': (calorie_goal * ratios['protein']) / 4,  # 4 cal/g
            'fat_g': (calorie_goal * ratios['fat']) / 9,          # 9 cal/g
            'carbs_g': (calorie_goal * ratios['carbs']) / 4       # 4 cal/g
        }
    
    def update_user_goals(self, user: User) -> User:
        """Update user's nutrition goals based on their profile."""
        if not user.goal_calories:  # Only auto-calculate if not manually set
            macro_goals = self.calculate_macro_goals(user)
            if macro_goals:
                user.goal_calories = macro_goals['calories']
                user.goal_protein_g = macro_goals['protein_g']
                user.goal_fat_g = macro_goals['fat_g']
                user.goal_carbs_g = macro_goals['carbs_g']
        
        # Set micronutrient goals based on age/gender (simplified)
        if user.gender == 'female':
            user.goal_iron_mg = 18.0
            user.goal_calcium_mg = 1000.0
        else:
            user.goal_iron_mg = 8.0
            user.goal_calcium_mg = 1000.0
            
        if user.age and user.age > 50:
            user.goal_calcium_mg = 1200.0
            
        return user

# Global instance
goal_calculator = NutritionGoalCalculator()

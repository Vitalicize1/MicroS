"""
Advanced goal setting system with macro cycling, periodization, and custom schedules
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, date
from enum import Enum
import json

class GoalType(Enum):
    STATIC = "static"  # Same goals every day
    WEEKLY_CYCLE = "weekly_cycle"  # Different goals per day of week
    TRAINING_CYCLE = "training_cycle"  # Goals based on training/rest days
    CUSTOM_SCHEDULE = "custom_schedule"  # Fully custom date-based goals
    MACRO_CYCLING = "macro_cycling"  # High/low carb cycling

class TrainingDay(Enum):
    REST = "rest"
    LIGHT = "light"
    MODERATE = "moderate"
    INTENSE = "intense"

class AdvancedGoalCalculator:
    """Calculate advanced nutrition goals with cycling and periodization"""
    
    def __init__(self):
        self.base_multipliers = {
            # Training day multipliers for different macros
            TrainingDay.REST: {'calories': 0.9, 'protein': 1.0, 'carbs': 0.7, 'fat': 1.2},
            TrainingDay.LIGHT: {'calories': 1.0, 'protein': 1.0, 'carbs': 1.0, 'fat': 1.0},
            TrainingDay.MODERATE: {'calories': 1.1, 'protein': 1.1, 'carbs': 1.2, 'fat': 0.9},
            TrainingDay.INTENSE: {'calories': 1.2, 'protein': 1.2, 'carbs': 1.4, 'fat': 0.8}
        }
    
    def calculate_bmr(self, weight_kg: float, height_cm: float, age: int, gender: str) -> float:
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor equation"""
        if gender.lower() == 'male':
            return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        else:
            return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    
    def calculate_tdee(self, bmr: float, activity_level: str) -> float:
        """Calculate Total Daily Energy Expenditure"""
        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }
        return bmr * activity_multipliers.get(activity_level, 1.55)
    
    def calculate_base_goals(self, user_profile: Dict) -> Dict:
        """Calculate base nutrition goals"""
        bmr = self.calculate_bmr(
            user_profile['weight_kg'],
            user_profile['height_cm'], 
            user_profile['age'],
            user_profile['gender']
        )
        
        tdee = self.calculate_tdee(bmr, user_profile.get('activity_level', 'moderate'))
        
        # Adjust calories based on goal type
        goal_adjustments = {
            'lose_weight': -500,  # 1 lb per week deficit
            'lose_weight_fast': -750,  # 1.5 lb per week
            'maintain': 0,
            'lean_bulk': 300,  # Slow muscle gain
            'bulk': 500,  # Faster muscle gain
            'muscle_gain': 400
        }
        
        goal_calories = tdee + goal_adjustments.get(user_profile.get('goal_type', 'maintain'), 0)
        
        # Calculate macro distribution based on goal
        macro_ratios = self.get_macro_ratios(user_profile.get('goal_type', 'maintain'))
        
        protein_calories = goal_calories * macro_ratios['protein']
        fat_calories = goal_calories * macro_ratios['fat'] 
        carb_calories = goal_calories * macro_ratios['carbs']
        
        return {
            'calories': goal_calories,
            'protein_g': protein_calories / 4,  # 4 cal per gram
            'fat_g': fat_calories / 9,  # 9 cal per gram
            'carbs_g': carb_calories / 4,  # 4 cal per gram
            'fiber_g': max(25, goal_calories * 0.014),  # 14g per 1000 cal
            'sodium_mg': 2300,
            'vitamin_c_mg': 90,
            'calcium_mg': 1000,
            'iron_mg': 18,
            'potassium_mg': 3500
        }
    
    def get_macro_ratios(self, goal_type: str) -> Dict[str, float]:
        """Get macro ratios for different goal types"""
        ratios = {
            'lose_weight': {'protein': 0.35, 'fat': 0.25, 'carbs': 0.40},  # High protein
            'lose_weight_fast': {'protein': 0.40, 'fat': 0.30, 'carbs': 0.30},  # Very high protein
            'maintain': {'protein': 0.25, 'fat': 0.30, 'carbs': 0.45},  # Balanced
            'lean_bulk': {'protein': 0.25, 'fat': 0.25, 'carbs': 0.50},  # Higher carbs
            'bulk': {'protein': 0.20, 'fat': 0.25, 'carbs': 0.55},  # High carbs
            'muscle_gain': {'protein': 0.25, 'fat': 0.25, 'carbs': 0.50},
            'keto': {'protein': 0.20, 'fat': 0.75, 'carbs': 0.05},  # Ketogenic
            'low_carb': {'protein': 0.30, 'fat': 0.50, 'carbs': 0.20}  # Low carb
        }
        return ratios.get(goal_type, ratios['maintain'])
    
    def calculate_training_day_goals(self, base_goals: Dict, training_day: TrainingDay) -> Dict:
        """Calculate goals for specific training day intensity"""
        multipliers = self.base_multipliers[training_day]
        
        return {
            'calories': base_goals['calories'] * multipliers['calories'],
            'protein_g': base_goals['protein_g'] * multipliers['protein'],
            'fat_g': base_goals['fat_g'] * multipliers['fat'],
            'carbs_g': base_goals['carbs_g'] * multipliers['carbs'],
            'fiber_g': base_goals['fiber_g'],
            'sodium_mg': base_goals['sodium_mg'],
            'vitamin_c_mg': base_goals['vitamin_c_mg'],
            'calcium_mg': base_goals['calcium_mg'],
            'iron_mg': base_goals['iron_mg'],
            'potassium_mg': base_goals['potassium_mg']
        }
    
    def calculate_macro_cycling_goals(self, base_goals: Dict, is_high_carb_day: bool) -> Dict:
        """Calculate goals for carb cycling (high/low carb days)"""
        if is_high_carb_day:
            # High carb: +50% carbs, -20% fat
            carb_multiplier = 1.5
            fat_multiplier = 0.8
        else:
            # Low carb: -50% carbs, +30% fat  
            carb_multiplier = 0.5
            fat_multiplier = 1.3
        
        # Adjust calories accordingly
        carb_cal_change = (base_goals['carbs_g'] * 4) * (carb_multiplier - 1)
        fat_cal_change = (base_goals['fat_g'] * 9) * (fat_multiplier - 1)
        calorie_adjustment = carb_cal_change + fat_cal_change
        
        return {
            'calories': base_goals['calories'] + calorie_adjustment,
            'protein_g': base_goals['protein_g'],  # Keep protein constant
            'fat_g': base_goals['fat_g'] * fat_multiplier,
            'carbs_g': base_goals['carbs_g'] * carb_multiplier,
            'fiber_g': base_goals['fiber_g'],
            'sodium_mg': base_goals['sodium_mg'],
            'vitamin_c_mg': base_goals['vitamin_c_mg'],
            'calcium_mg': base_goals['calcium_mg'],
            'iron_mg': base_goals['iron_mg'],
            'potassium_mg': base_goals['potassium_mg']
        }
    
    def generate_weekly_schedule(self, base_goals: Dict, training_schedule: List[TrainingDay]) -> Dict[int, Dict]:
        """Generate goals for each day of the week (0=Monday, 6=Sunday)"""
        if len(training_schedule) != 7:
            raise ValueError("Training schedule must have 7 days")
        
        weekly_goals = {}
        for day_of_week, training_day in enumerate(training_schedule):
            weekly_goals[day_of_week] = self.calculate_training_day_goals(base_goals, training_day)
        
        return weekly_goals
    
    def get_goals_for_date(self, user_profile: Dict, target_date: date) -> Dict:
        """Get nutrition goals for a specific date based on user's advanced goal settings"""
        base_goals = self.calculate_base_goals(user_profile)
        
        goal_type = user_profile.get('advanced_goal_type', GoalType.STATIC.value)
        
        if goal_type == GoalType.STATIC.value:
            return base_goals
        
        elif goal_type == GoalType.WEEKLY_CYCLE.value:
            training_schedule = user_profile.get('training_schedule', [
                TrainingDay.MODERATE.value, TrainingDay.MODERATE.value, TrainingDay.REST.value,
                TrainingDay.INTENSE.value, TrainingDay.LIGHT.value, TrainingDay.INTENSE.value, TrainingDay.REST.value
            ])
            
            # Convert string values to TrainingDay enums
            training_schedule = [TrainingDay(day) for day in training_schedule]
            weekly_goals = self.generate_weekly_schedule(base_goals, training_schedule)
            
            day_of_week = target_date.weekday()  # 0=Monday
            return weekly_goals[day_of_week]
        
        elif goal_type == GoalType.MACRO_CYCLING.value:
            # Alternate high/low carb days or use custom pattern
            cycling_pattern = user_profile.get('carb_cycling_pattern', 'alternate')  # 'alternate', '2high_1low', '5high_2low'
            
            if cycling_pattern == 'alternate':
                is_high_carb_day = target_date.toordinal() % 2 == 0
            elif cycling_pattern == '2high_1low':
                cycle_position = target_date.toordinal() % 3
                is_high_carb_day = cycle_position in [0, 1]  # 2 high, 1 low
            elif cycling_pattern == '5high_2low':
                cycle_position = target_date.toordinal() % 7
                is_high_carb_day = cycle_position < 5  # 5 high, 2 low
            else:
                is_high_carb_day = True
            
            return self.calculate_macro_cycling_goals(base_goals, is_high_carb_day)
        
        elif goal_type == GoalType.CUSTOM_SCHEDULE.value:
            # Use custom date-based goals (would be stored in database)
            custom_goals = user_profile.get('custom_schedule', {})
            date_str = target_date.isoformat()
            
            if date_str in custom_goals:
                return custom_goals[date_str]
            else:
                return base_goals
        
        return base_goals

# Global instance
advanced_goal_calculator = AdvancedGoalCalculator()

class GoalTemplate:
    """Predefined goal templates for common scenarios"""
    
    @staticmethod
    def get_templates() -> Dict[str, Dict]:
        return {
            'bodybuilding_prep': {
                'name': 'Bodybuilding Contest Prep',
                'description': 'High protein, training-based cycling for contest prep',
                'goal_type': GoalType.TRAINING_CYCLE.value,
                'training_schedule': [
                    TrainingDay.INTENSE.value,  # Monday - Upper
                    TrainingDay.MODERATE.value,  # Tuesday - Lower
                    TrainingDay.REST.value,      # Wednesday - Rest
                    TrainingDay.INTENSE.value,   # Thursday - Push
                    TrainingDay.INTENSE.value,   # Friday - Pull
                    TrainingDay.LIGHT.value,     # Saturday - Legs
                    TrainingDay.REST.value       # Sunday - Rest
                ],
                'macro_ratios': {'protein': 0.40, 'fat': 0.20, 'carbs': 0.40}
            },
            'powerlifting': {
                'name': 'Powerlifting Training',
                'description': 'Higher calories on heavy training days',
                'goal_type': GoalType.TRAINING_CYCLE.value,
                'training_schedule': [
                    TrainingDay.INTENSE.value,   # Monday - Squat
                    TrainingDay.LIGHT.value,     # Tuesday - Accessories
                    TrainingDay.INTENSE.value,   # Wednesday - Bench
                    TrainingDay.REST.value,      # Thursday - Rest
                    TrainingDay.INTENSE.value,   # Friday - Deadlift
                    TrainingDay.LIGHT.value,     # Saturday - Accessories
                    TrainingDay.REST.value       # Sunday - Rest
                ],
                'macro_ratios': {'protein': 0.25, 'fat': 0.30, 'carbs': 0.45}
            },
            'carb_cycling': {
                'name': 'Carb Cycling',
                'description': 'Alternating high and low carb days',
                'goal_type': GoalType.MACRO_CYCLING.value,
                'carb_cycling_pattern': 'alternate',
                'macro_ratios': {'protein': 0.30, 'fat': 0.35, 'carbs': 0.35}
            },
            'weekend_warrior': {
                'name': 'Weekend Warrior',
                'description': 'Higher calories on weekends for active lifestyle',
                'goal_type': GoalType.WEEKLY_CYCLE.value,
                'training_schedule': [
                    TrainingDay.LIGHT.value,     # Monday
                    TrainingDay.LIGHT.value,     # Tuesday
                    TrainingDay.MODERATE.value,  # Wednesday
                    TrainingDay.LIGHT.value,     # Thursday
                    TrainingDay.MODERATE.value,  # Friday
                    TrainingDay.INTENSE.value,   # Saturday
                    TrainingDay.INTENSE.value    # Sunday
                ],
                'macro_ratios': {'protein': 0.25, 'fat': 0.30, 'carbs': 0.45}
            }
        }
    
    @staticmethod
    def apply_template(template_name: str, user_profile: Dict) -> Dict:
        """Apply a goal template to user profile"""
        templates = GoalTemplate.get_templates()
        
        if template_name not in templates:
            raise ValueError(f"Template '{template_name}' not found")
        
        template = templates[template_name]
        updated_profile = user_profile.copy()
        
        # Apply template settings
        for key, value in template.items():
            if key not in ['name', 'description']:
                updated_profile[key] = value
        
        return updated_profile

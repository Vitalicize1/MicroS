from typing import List, Dict, Any
from .schemas import NutritionTotals
from .models import MealLog, Food

def compute_totals(meal_logs: List[MealLog]) -> NutritionTotals:
    """Compute nutrition totals from meal logs, scaling per-100g values by grams"""
    totals = NutritionTotals()
    
    for log in meal_logs:
        food = log.food
        scale_factor = log.grams / 100.0  # Convert from per-100g to actual grams
        
        # Macronutrients
        totals.calories += food.calories * scale_factor
        totals.protein_g += food.protein_g * scale_factor
        totals.fat_g += food.fat_g * scale_factor
        totals.carbs_g += food.carbs_g * scale_factor
        
        # Fat-soluble vitamins
        totals.vitamin_a_rae += (food.vitamin_a_rae or 0) * scale_factor
        totals.vitamin_d_iu += (food.vitamin_d_iu or 0) * scale_factor
        totals.vitamin_e_mg += (food.vitamin_e_mg or 0) * scale_factor
        totals.vitamin_k_mcg += (food.vitamin_k_mcg or 0) * scale_factor
        
        # Water-soluble vitamins
        totals.vitamin_c_mg += (food.vitamin_c_mg or 0) * scale_factor
        totals.vitamin_b1_mg += (food.vitamin_b1_mg or 0) * scale_factor
        totals.vitamin_b2_mg += (food.vitamin_b2_mg or 0) * scale_factor
        totals.vitamin_b3_mg += (food.vitamin_b3_mg or 0) * scale_factor
        totals.vitamin_b5_mg += (food.vitamin_b5_mg or 0) * scale_factor
        totals.vitamin_b6_mg += (food.vitamin_b6_mg or 0) * scale_factor
        totals.vitamin_b7_mcg += (food.vitamin_b7_mcg or 0) * scale_factor
        totals.vitamin_b9_mcg += (food.vitamin_b9_mcg or 0) * scale_factor
        totals.vitamin_b12_mcg += (food.vitamin_b12_mcg or 0) * scale_factor
        totals.choline_mg += (food.choline_mg or 0) * scale_factor
        
        # Macrominerals
        totals.calcium_mg += (food.calcium_mg or 0) * scale_factor
        totals.phosphorus_mg += (food.phosphorus_mg or 0) * scale_factor
        totals.magnesium_mg += (food.magnesium_mg or 0) * scale_factor
        totals.sodium_mg += (food.sodium_mg or 0) * scale_factor
        totals.potassium_mg += (food.potassium_mg or 0) * scale_factor
        totals.chloride_mg += (food.chloride_mg or 0) * scale_factor
        totals.sulfur_mg += (food.sulfur_mg or 0) * scale_factor
        
        # Trace minerals
        totals.iron_mg += (food.iron_mg or 0) * scale_factor
        totals.zinc_mg += (food.zinc_mg or 0) * scale_factor
        totals.copper_mg += (food.copper_mg or 0) * scale_factor
        totals.manganese_mg += (food.manganese_mg or 0) * scale_factor
        totals.iodine_mcg += (food.iodine_mcg or 0) * scale_factor
        totals.selenium_mcg += (food.selenium_mcg or 0) * scale_factor
        totals.chromium_mcg += (food.chromium_mcg or 0) * scale_factor
        totals.molybdenum_mcg += (food.molybdenum_mcg or 0) * scale_factor
        totals.fluoride_mg += (food.fluoride_mg or 0) * scale_factor
    
    return totals

def compare_to_goals(totals: NutritionTotals, goals: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    """Compare nutrition totals to goals and return deltas and percentages"""
    comparison = {}
    
    for nutrient, goal in goals.items():
        if hasattr(totals, nutrient):
            actual = getattr(totals, nutrient)
            delta = actual - goal
            percentage = (actual / goal * 100) if goal > 0 else 0
            
            comparison[nutrient] = {
                "actual": actual,
                "goal": goal,
                "delta": delta,
                "percentage": percentage,
                "met": actual >= goal
            }
    
    return comparison

def get_nutrient_gaps(totals: NutritionTotals, goals: Dict[str, float]) -> List[str]:
    """Get list of nutrients that are below goals"""
    gaps = []
    comparison = compare_to_goals(totals, goals)
    
    for nutrient, data in comparison.items():
        if not data["met"]:
            gaps.append(nutrient)
    
    return gaps

def format_nutrition_summary(totals: NutritionTotals, goals: Dict[str, float] = None) -> str:
    """Format nutrition totals into a readable summary"""
    summary = f"🍎 Comprehensive Nutrition Summary\n"
    summary += "=" * 40 + "\n\n"
    
    # Macronutrients
    summary += "📊 MACRONUTRIENTS:\n"
    summary += f"  Calories: {totals.calories:.1f} kcal\n"
    summary += f"  Protein: {totals.protein_g:.1f}g\n"
    summary += f"  Fat: {totals.fat_g:.1f}g\n"
    summary += f"  Carbs: {totals.carbs_g:.1f}g\n\n"
    
    # Fat-soluble vitamins
    summary += "🟡 FAT-SOLUBLE VITAMINS:\n"
    summary += f"  Vitamin A: {totals.vitamin_a_rae:.1f} RAE\n"
    summary += f"  Vitamin D: {totals.vitamin_d_iu:.1f} IU\n"
    summary += f"  Vitamin E: {totals.vitamin_e_mg:.1f}mg\n"
    summary += f"  Vitamin K: {totals.vitamin_k_mcg:.1f}mcg\n\n"
    
    # Water-soluble vitamins
    summary += "💧 WATER-SOLUBLE VITAMINS:\n"
    summary += f"  Vitamin C: {totals.vitamin_c_mg:.1f}mg\n"
    summary += f"  Thiamin (B1): {totals.vitamin_b1_mg:.2f}mg\n"
    summary += f"  Riboflavin (B2): {totals.vitamin_b2_mg:.2f}mg\n"
    summary += f"  Niacin (B3): {totals.vitamin_b3_mg:.1f}mg\n"
    summary += f"  Pantothenic Acid (B5): {totals.vitamin_b5_mg:.1f}mg\n"
    summary += f"  Pyridoxine (B6): {totals.vitamin_b6_mg:.2f}mg\n"
    summary += f"  Biotin (B7): {totals.vitamin_b7_mcg:.1f}mcg\n"
    summary += f"  Folate (B9): {totals.vitamin_b9_mcg:.1f}mcg\n"
    summary += f"  Cobalamin (B12): {totals.vitamin_b12_mcg:.2f}mcg\n"
    summary += f"  Choline: {totals.choline_mg:.1f}mg\n\n"
    
    # Macrominerals
    summary += "⚪ MACROMINERALS:\n"
    summary += f"  Calcium: {totals.calcium_mg:.1f}mg\n"
    summary += f"  Phosphorus: {totals.phosphorus_mg:.1f}mg\n"
    summary += f"  Magnesium: {totals.magnesium_mg:.1f}mg\n"
    summary += f"  Sodium: {totals.sodium_mg:.1f}mg\n"
    summary += f"  Potassium: {totals.potassium_mg:.1f}mg\n"
    summary += f"  Chloride: {totals.chloride_mg:.1f}mg\n"
    summary += f"  Sulfur: {totals.sulfur_mg:.1f}mg\n\n"
    
    # Trace minerals
    summary += "🔍 TRACE MINERALS:\n"
    summary += f"  Iron: {totals.iron_mg:.1f}mg\n"
    summary += f"  Zinc: {totals.zinc_mg:.1f}mg\n"
    summary += f"  Copper: {totals.copper_mg:.2f}mg\n"
    summary += f"  Manganese: {totals.manganese_mg:.1f}mg\n"
    summary += f"  Iodine: {totals.iodine_mcg:.1f}mcg\n"
    summary += f"  Selenium: {totals.selenium_mcg:.1f}mcg\n"
    summary += f"  Chromium: {totals.chromium_mcg:.1f}mcg\n"
    summary += f"  Molybdenum: {totals.molybdenum_mcg:.1f}mcg\n"
    summary += f"  Fluoride: {totals.fluoride_mg:.2f}mg\n\n"
    
    if goals:
        comparison = compare_to_goals(totals, goals)
        summary += "🎯 GOAL PROGRESS:\n"
        summary += "=" * 30 + "\n"
        for nutrient, data in comparison.items():
            status = "✅" if data["met"] else "❌"
            summary += f"{status} {nutrient}: {data['actual']:.1f}/{data['goal']:.1f} ({data['percentage']:.1f}%)\n"
    
    return summary

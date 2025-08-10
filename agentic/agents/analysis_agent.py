from typing import Dict, Any
from agentic.tools import tool_compute_day, tool_get_user_goals

class AnalysisAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle daily summary and nutrition analysis"""
        # Get date from entities or use today
        date_iso = state["entities"].get("date")
        
        # Handle "today" and other relative dates
        if date_iso in ["today", "now", None]:
            date_iso = None  # Use current date
        elif date_iso == "yesterday":
            from datetime import date, timedelta
            yesterday = date.today() - timedelta(days=1)
            date_iso = yesterday.isoformat()
        
        # Compute daily totals
        day_data = tool_compute_day(state["user_id"], date_iso)
        
        if "error" in day_data:
            state["response"] = f"Error computing daily summary: {day_data['error']}"
            return state
        
        # Store both full day_data and totals
        state["day_data"] = day_data
        state["day_totals"] = day_data["totals"]
        
        # Get user goals
        goals = tool_get_user_goals(state["user_id"])
        state["goals"] = goals
        
        # Format response
        totals = day_data["totals"]
        date_str = day_data["date"]
        meal_count = day_data["meal_count"]
        
        response = f"Daily Summary for {date_str}:\n"
        response += f"Meals logged: {meal_count}\n"
        response += f"Calories: {totals['calories']:.1f}\n"
        response += f"Protein: {totals['protein_g']:.1f}g\n"
        response += f"Fat: {totals['fat_g']:.1f}g\n"
        response += f"Carbs: {totals['carbs_g']:.1f}g\n"
        response += f"Vitamin C: {totals['vitamin_c_mg']:.1f}mg\n"
        response += f"Calcium: {totals['calcium_mg']:.1f}mg\n"
        response += f"Iron: {totals['iron_mg']:.1f}mg\n"
        response += f"Magnesium: {totals['magnesium_mg']:.1f}mg\n"
        
        # Compare to goals if available
        if goals:
            response += "\nGoal Progress:\n"
            for nutrient, goal in goals.items():
                if nutrient in totals:
                    actual = totals[nutrient]
                    percentage = (actual / goal * 100) if goal > 0 else 0
                    status = "✅" if actual >= goal else "❌"
                    response += f"{status} {nutrient}: {actual:.1f}/{goal:.1f} ({percentage:.1f}%)\n"
        
        state["response"] = response
        return state

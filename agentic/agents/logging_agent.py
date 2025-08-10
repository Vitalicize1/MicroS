from typing import Dict, Any
from agentic.tools import tool_log_meal, tool_list_foods

class LoggingAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle meal logging"""
        entities = state.get("entities", {})

        # If user provided a food_id explicitly, we can log immediately (after grams check)
        if entities.get("food_id"):
            food_id = entities["food_id"]
            grams = entities.get("grams")
            if not grams:
                state["needs_clarification"] = True
                state["questions"] = ["How many grams?"]
                state["response"] = "How many grams would you like to log?"
                return state
            meal_type = entities.get("meal_type", "snack")
            result = tool_log_meal(
                user_id=state["user_id"],
                food_id=int(food_id),
                grams=float(grams),
                meal_type=meal_type,
            )
            if "error" in result:
                state["response"] = f"Error logging meal: {result['error']}"
            else:
                state["log_entry"] = result
                state["response"] = f"Logged {result['grams']}g of {result['food_name']} ({result['meal_type']})."
            return state

        # Otherwise, rely on candidates/selected food flow
        if not state.get("food_candidates") and not state.get("selected_food"):
            suggestions = tool_list_foods(limit=5)
            state["needs_clarification"] = True
            state["questions"] = ["What food would you like to log? You can choose an ID from suggestions."]
            state["food_candidates"] = suggestions
            state["response"] = "What food would you like to log?"
            return state
        
        # Get food to log
        food = state.get("selected_food")
        if not food and state.get("food_candidates"):
            if len(state["food_candidates"]) > 1:
                state["needs_clarification"] = True
                state["questions"] = [f"Which food (1-{len(state['food_candidates'])})?"]
                state["response"] = "Please specify which food item you'd like to log."
                return state
            else:
                food = state["food_candidates"][0]
        
        # Get grams from entities
        grams = entities.get("grams")
        if not grams:
            state["needs_clarification"] = True
            state["questions"] = ["How many grams?"]
            state["response"] = f"How many grams of {food['name']} would you like to log?"
            return state
        
        # Get meal type
        meal_type = entities.get("meal_type", "snack")
        
        # Log the meal
        result = tool_log_meal(
            user_id=state["user_id"],
            food_id=food["id"],
            grams=grams,
            meal_type=meal_type
        )
        
        if "error" in result:
            state["response"] = f"Error logging meal: {result['error']}"
        else:
            state["log_entry"] = result
            state["response"] = f"Logged {grams}g of {food['name']} ({meal_type})."
        
        return state

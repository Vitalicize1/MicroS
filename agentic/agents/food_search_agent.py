from typing import Dict, Any
from agentic.tools import tool_search_food

class FoodSearchAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle food search by name"""
        food_name = state["entities"].get("food_name")
        
        if not food_name:
            state["needs_clarification"] = True
            state["questions"] = ["What food would you like to search for?"]
            state["response"] = "What food would you like to search for?"
            return state
        
        # Search for food
        foods = tool_search_food(food_name, limit=5)
        
        if foods:
            state["food_candidates"] = foods
            state["response"] = f"Found {len(foods)} food items."
        else:
            state["response"] = f"No foods found matching '{food_name}'. Try a different search term."
        
        return state

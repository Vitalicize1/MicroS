from typing import Dict, Any
from ..tools import tool_lookup_upc

class BarcodeAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle barcode/UPC lookup"""
        upc = state["entities"].get("upc")
        
        if not upc:
            state["needs_clarification"] = True
            state["questions"] = ["Please provide a UPC code to scan."]
            state["response"] = "I need a UPC code to look up the product. Please provide the barcode number."
            return state
        
        # Lookup UPC in database
        foods = tool_lookup_upc(upc)
        
        if foods:
            state["food_candidates"] = foods
            state["selected_food"] = foods[0]  # Take first match
            state["response"] = f"Found {foods[0]['name']} ({foods[0]['brand']}). {foods[0]['calories']} calories per 100g."
        else:
            state["needs_clarification"] = True
            state["questions"] = ["Would you like to search by name instead?"]
            state["response"] = f"No food found with UPC {upc}. Would you like to search by name instead?"
        
        return state

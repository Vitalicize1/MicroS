from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langgraph.graph.message import add_messages

class GraphState(TypedDict):
    """State for the LangGraph workflow.
    Uses message-centric state for tool-calling while preserving legacy keys for API compatibility.
    """
    # Message state (LangGraph convention)
    messages: Annotated[List, add_messages]

    # Legacy/compat fields consumed by API and agents
    user_id: int
    input_text: str
    intent: Optional[str]  # scan_barcode, search_food, log_meal, daily_summary, recommend
    entities: Dict[str, Any]  # Extracted entities like food_name, grams, upc, etc.
    food_candidates: List[Dict[str, Any]]  # Search results
    selected_food: Optional[Dict[str, Any]]  # Chosen food item
    log_entry: Optional[Dict[str, Any]]  # Meal log entry
    day_totals: Optional[Dict[str, float]]  # Daily nutrition totals
    goals: Optional[Dict[str, float]]  # User nutrition goals
    response: str  # Final response to user
    needs_clarification: bool  # Whether we need more info
    questions: List[str]  # Follow-up questions
    confidence: float  # Confidence in the response

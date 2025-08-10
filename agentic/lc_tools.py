from typing import List, Optional
from pydantic import BaseModel, Field
from langchain.tools import StructuredTool

# Import our concrete tool functions
from agentic.tools import (
    tool_search_food,
    tool_lookup_upc,
    tool_list_foods,
    tool_log_meal,
    tool_delete_meal,
    tool_list_meals,
    tool_update_meal,
    tool_recent_foods,
    tool_compute_day,
    tool_compute_range,
    tool_get_user_goals,
    tool_set_user_goals,
)

# --------- Arg Schemas ---------
class SearchFoodArgs(BaseModel):
    query: str = Field(..., description="Food name to search for")
    limit: int = Field(5, description="Max items to return")

class LookupUpcArgs(BaseModel):
    upc: str = Field(..., description="12-digit UPC")

class ListFoodsArgs(BaseModel):
    limit: int = Field(25)
    offset: int = Field(0)

class LogMealArgs(BaseModel):
    user_id: int
    food_id: int
    grams: float
    meal_type: str = Field("snack")
    notes: Optional[str] = None

class UpdateMealArgs(BaseModel):
    meal_id: int
    grams: Optional[float] = None
    meal_type: Optional[str] = None
    notes: Optional[str] = None

class DeleteMealArgs(BaseModel):
    meal_id: int

class ListMealsArgs(BaseModel):
    user_id: int
    limit: int = 25
    offset: int = 0

class RecentFoodsArgs(BaseModel):
    user_id: int
    limit: int = 10

class ComputeDayArgs(BaseModel):
    user_id: int
    date_iso: Optional[str] = Field(None, description="ISO date like 2025-01-01 or null for today")

class ComputeRangeArgs(BaseModel):
    user_id: int
    start_date_iso: str
    end_date_iso: str

class GetGoalsArgs(BaseModel):
    user_id: int

class SetGoalsArgs(BaseModel):
    user_id: int
    goals: dict

# --------- Structured Tools ---------
FOOD_SEARCH_TOOL = StructuredTool.from_function(
    func=tool_search_food,
    name="tool_search_food",
    description="Search foods by name (ILIKE). Returns id, name, brand, macros.",
    args_schema=SearchFoodArgs,
)

LOOKUP_UPC_TOOL = StructuredTool.from_function(
    func=tool_lookup_upc,
    name="tool_lookup_upc",
    description="Lookup a product by UPC code (12 digits).",
    args_schema=LookupUpcArgs,
)

LIST_FOODS_TOOL = StructuredTool.from_function(
    func=tool_list_foods,
    name="tool_list_foods",
    description="List foods for browsing with pagination.",
    args_schema=ListFoodsArgs,
)

LOG_MEAL_TOOL = StructuredTool.from_function(
    func=tool_log_meal,
    name="tool_log_meal",
    description="Create a meal log entry for a user.",
    args_schema=LogMealArgs,
)

UPDATE_MEAL_TOOL = StructuredTool.from_function(
    func=tool_update_meal,
    name="tool_update_meal",
    description="Update a meal log (grams, meal_type, notes).",
    args_schema=UpdateMealArgs,
)

DELETE_MEAL_TOOL = StructuredTool.from_function(
    func=tool_delete_meal,
    name="tool_delete_meal",
    description="Delete a meal log by id.",
    args_schema=DeleteMealArgs,
)

LIST_MEALS_TOOL = StructuredTool.from_function(
    func=tool_list_meals,
    name="tool_list_meals",
    description="List recent meal logs for a user.",
    args_schema=ListMealsArgs,
)

RECENT_FOODS_TOOL = StructuredTool.from_function(
    func=tool_recent_foods,
    name="tool_recent_foods",
    description="Return distinct recently used foods for a user.",
    args_schema=RecentFoodsArgs,
)

COMPUTE_DAY_TOOL = StructuredTool.from_function(
    func=tool_compute_day,
    name="tool_compute_day",
    description="Compute daily nutrition totals and meal list for a specific date.",
    args_schema=ComputeDayArgs,
)

COMPUTE_RANGE_TOOL = StructuredTool.from_function(
    func=tool_compute_range,
    name="tool_compute_range",
    description="Compute rollup totals across an inclusive date range.",
    args_schema=ComputeRangeArgs,
)

GET_GOALS_TOOL = StructuredTool.from_function(
    func=tool_get_user_goals,
    name="tool_get_user_goals",
    description="Get user's micronutrient goals.",
    args_schema=GetGoalsArgs,
)

SET_GOALS_TOOL = StructuredTool.from_function(
    func=tool_set_user_goals,
    name="tool_set_user_goals",
    description="Set user's micronutrient goals (numeric map).",
    args_schema=SetGoalsArgs,
)


def get_langchain_tools() -> List[StructuredTool]:
    """Return all StructuredTools for use with llm.bind_tools / ToolNode."""
    return [
        FOOD_SEARCH_TOOL,
        LOOKUP_UPC_TOOL,
        LIST_FOODS_TOOL,
        LOG_MEAL_TOOL,
        UPDATE_MEAL_TOOL,
        DELETE_MEAL_TOOL,
        LIST_MEALS_TOOL,
        RECENT_FOODS_TOOL,
        COMPUTE_DAY_TOOL,
        COMPUTE_RANGE_TOOL,
        GET_GOALS_TOOL,
        SET_GOALS_TOOL,
    ]

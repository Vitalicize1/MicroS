from typing import List
from langchain.tools import StructuredTool

from agentic.lc_tools import (
    COMPUTE_DAY_TOOL,
    GET_GOALS_TOOL,
)

TOOL_NAMES = [
    COMPUTE_DAY_TOOL.name,
    GET_GOALS_TOOL.name,
]

def get_tools() -> List[StructuredTool]:
    return [COMPUTE_DAY_TOOL, GET_GOALS_TOOL]

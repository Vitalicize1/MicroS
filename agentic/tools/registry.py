from typing import Callable, Dict, Any, Optional

class ToolSpec:
    def __init__(self, name: str, func: Callable[..., Any], description: str, schema: Optional[Dict[str, Any]] = None):
        self.name = name
        self.func = func
        self.description = description
        self.schema = schema or {}

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec):
        if spec.name in self._tools:
            raise ValueError(f"Tool already registered: {spec.name}")
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec:
        return self._tools[name]

    def list(self) -> Dict[str, ToolSpec]:
        return dict(self._tools)

TOOL_REGISTRY = ToolRegistry()

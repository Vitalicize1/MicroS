import os
from dotenv import load_dotenv

def setup_langsmith() -> None:
    """Configure LangSmith/LangChain observability from environment.
    Set the following in .env for full tracing:
      - LANGCHAIN_TRACING_V2=true
      - LANGCHAIN_API_KEY=lsm_...
      - LANGCHAIN_PROJECT=micros-dev (optional)
      - LANGCHAIN_ENDPOINT=https://api.smith.langchain.com (default)
    """
    load_dotenv()

    # Respect user-provided values; set safe defaults if partial
    endpoint = os.getenv("LANGCHAIN_ENDPOINT") or "https://api.smith.langchain.com"
    tracing = os.getenv("LANGCHAIN_TRACING_V2")
    api_key = os.getenv("LANGCHAIN_API_KEY")
    project = os.getenv("LANGCHAIN_PROJECT") or "micros-dev"

    # Only enable if API key present or tracing explicitly true
    if api_key or (tracing and tracing.lower() in {"1", "true", "yes"}):
        os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
        os.environ.setdefault("LANGCHAIN_ENDPOINT", endpoint)
        if api_key:
            os.environ.setdefault("LANGCHAIN_API_KEY", api_key)
        os.environ.setdefault("LANGCHAIN_PROJECT", project)

        # Optional: reduce verbose debug logs
        os.environ.setdefault("LANGCHAIN_CALLBACKS_BACKGROUND", "true")

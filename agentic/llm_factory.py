import os
from typing import Optional, Union
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# Ensure .env is loaded for any entrypoint (run.py, flask, tests)
load_dotenv()

def get_llm(provider: Optional[str] = None) -> Union[ChatOpenAI, ChatGoogleGenerativeAI]:
    """
    Get LLM instance based on provider preference
    
    Args:
        provider: 'openai', 'gemini', or None (auto-detect)
    
    Returns:
        LLM instance
    """
    if provider is None:
        provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "sk-xxxx":
            raise ValueError("OpenAI API key not set. Please set OPENAI_API_KEY in .env")
        
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
            api_key=api_key,
            timeout=30,  # 30 second timeout
            max_retries=2
        )
    
    elif provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your-gemini-api-key":
            raise ValueError("Gemini API key not set. Please set GEMINI_API_KEY in .env")
        
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.1,
            google_api_key=api_key,
            timeout=30,  # 30 second timeout
            max_retries=2
        )
    
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}. Use 'openai' or 'gemini'")

def get_available_providers() -> list[str]:
    """Get list of available LLM providers with valid API keys"""
    providers = []
    
    # Check OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key != "sk-xxxx":
        providers.append("openai")
    
    # Check Gemini
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key != "your-gemini-api-key":
        providers.append("gemini")
    
    return providers

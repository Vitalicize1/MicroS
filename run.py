#!/usr/bin/env python3
"""
Micros - Nutrition tracking with AI agents
Quick local runner for testing the agent workflow
"""

import os
import sys
from dotenv import load_dotenv

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import create_tables
from agentic.graph import run_agent
from agentic.observability import setup_langsmith

def main():
    """Main runner function"""
    load_dotenv()
    setup_langsmith()

    print("🍎 Micros - Nutrition Tracking with AI Agents")
    print("=" * 50)

    # Create database tables
    print("📊 Creating database tables...")
    create_tables()
    print("✅ Database ready")

    # Test the agent workflow
    print("\n🤖 Testing agent workflow...")

    # Sample test cases
    test_cases = [
        {"user_id": 1, "message": "search oats", "description": "Search for oats"},
        {"user_id": 1, "message": "log meal: 100g food_id=1", "description": "Log a meal"},
        {"user_id": 1, "message": "daily summary today", "description": "Get daily summary"},
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- Test {i}: {test_case['description']} ---")
        print(f"Input: {test_case['message']}")
        try:
            result = run_agent(test_case['user_id'], test_case['message'])
            print(f"Intent: {result.get('intent', 'unknown')}")
            print(f"Response: {result.get('response', 'No response')}")
            print(f"Confidence: {result.get('confidence', 0.0):.2f}")
        except Exception as e:
            print(f"❌ Error: {e}")

    print("\n🚀 Ready to run Flask server!")
    print("Run: export FLASK_APP=app.api && flask run")
    print("Or: python -m flask --app app.api run")

if __name__ == "__main__":
    main()

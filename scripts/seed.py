#!/usr/bin/env python3
"""
Seed script to populate the database with sample food data
"""

import os
import sys
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal, create_tables
from app.models import User, Food

def seed_database():
    """Seed the database with sample data"""
    db = SessionLocal()
    
    try:
        # Create tables if they don't exist
        create_tables()
        
        # Create a sample user
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                id=1,
                username="demo_user",
                email="demo@example.com",
                prefs={
                    "goals": {
                        "calories": 2000,
                        "protein_g": 150,
                        "vitamin_c_mg": 90,
                        "calcium_mg": 1000,
                        "iron_mg": 18,
                        "magnesium_mg": 400
                    }
                }
            )
            db.add(user)
            print("✅ Created demo user")
        
        # Sample food data with comprehensive micronutrient values per 100g
        foods_data = [
            {
                "name": "Rolled Oats",
                "brand": "Generic", 
                "upc": "000000000001",
                # Macronutrients
                "calories": 389,
                "protein_g": 16.9,
                "fat_g": 6.9,
                "carbs_g": 66.3,
                # Fat-soluble vitamins
                "vitamin_a_rae": 0,
                "vitamin_d_iu": 0,
                "vitamin_e_mg": 0.7,
                "vitamin_k_mcg": 2.0,
                # Water-soluble vitamins
                "vitamin_c_mg": 0,
                "vitamin_b1_mg": 0.76,  # Thiamin
                "vitamin_b2_mg": 0.14,  # Riboflavin
                "vitamin_b3_mg": 0.96,  # Niacin
                "vitamin_b5_mg": 1.35,  # Pantothenic Acid
                "vitamin_b6_mg": 0.12,  # Pyridoxine
                "vitamin_b7_mcg": 20.0,  # Biotin
                "vitamin_b9_mcg": 56.0,  # Folate
                "vitamin_b12_mcg": 0.0,  # Cobalamin
                "choline_mg": 40.4,
                # Macrominerals
                "calcium_mg": 54,
                "phosphorus_mg": 523,
                "magnesium_mg": 177,
                "sodium_mg": 2,
                "potassium_mg": 429,
                "chloride_mg": 50,
                "sulfur_mg": 170,
                # Trace minerals
                "iron_mg": 4.7,
                "zinc_mg": 4.0,
                "copper_mg": 0.63,
                "manganese_mg": 4.9,
                "iodine_mcg": 2.0,
                "selenium_mcg": 28.9,
                "chromium_mcg": 8.0,
                "molybdenum_mcg": 48.0,
                "fluoride_mg": 0.02
            },
            {
                "name": "Spinach, raw",
                "brand": "Generic",
                "upc": "000000000002",
                # Macronutrients
                "calories": 23,
                "protein_g": 2.9,
                "fat_g": 0.4,
                "carbs_g": 3.6,
                # Fat-soluble vitamins
                "vitamin_a_rae": 469,
                "vitamin_d_iu": 0,
                "vitamin_e_mg": 2.0,
                "vitamin_k_mcg": 483,
                # Water-soluble vitamins
                "vitamin_c_mg": 28.1,
                "vitamin_b1_mg": 0.08,  # Thiamin
                "vitamin_b2_mg": 0.19,  # Riboflavin
                "vitamin_b3_mg": 0.72,  # Niacin
                "vitamin_b5_mg": 0.07,  # Pantothenic Acid
                "vitamin_b6_mg": 0.20,  # Pyridoxine
                "vitamin_b7_mcg": 6.8,   # Biotin
                "vitamin_b9_mcg": 194.0, # Folate
                "vitamin_b12_mcg": 0.0,  # Cobalamin
                "choline_mg": 19.3,
                # Macrominerals
                "calcium_mg": 99,
                "phosphorus_mg": 49,
                "magnesium_mg": 79,
                "sodium_mg": 79,
                "potassium_mg": 558,
                "chloride_mg": 120,
                "sulfur_mg": 51,
                # Trace minerals
                "iron_mg": 2.7,
                "zinc_mg": 0.5,
                "copper_mg": 0.13,
                "manganese_mg": 0.90,
                "iodine_mcg": 12.0,
                "selenium_mcg": 1.0,
                "chromium_mcg": 2.0,
                "molybdenum_mcg": 7.0,
                "fluoride_mg": 0.02
            },
            {
                "name": "Atlantic Salmon, raw",
                "brand": "Generic",
                "upc": "000000000003",
                # Macronutrients
                "calories": 208,
                "protein_g": 25.4,
                "fat_g": 12.4,
                "carbs_g": 0,
                # Fat-soluble vitamins
                "vitamin_a_rae": 149,
                "vitamin_d_iu": 526,
                "vitamin_e_mg": 3.6,
                "vitamin_k_mcg": 0.7,
                # Water-soluble vitamins
                "vitamin_c_mg": 3.9,
                "vitamin_b1_mg": 0.23,  # Thiamin
                "vitamin_b2_mg": 0.38,  # Riboflavin
                "vitamin_b3_mg": 8.5,   # Niacin
                "vitamin_b5_mg": 1.66,  # Pantothenic Acid
                "vitamin_b6_mg": 0.94,  # Pyridoxine
                "vitamin_b7_mcg": 5.0,   # Biotin
                "vitamin_b9_mcg": 25.0,  # Folate
                "vitamin_b12_mcg": 3.2,  # Cobalamin
                "choline_mg": 90.6,
                # Macrominerals
                "calcium_mg": 9,
                "phosphorus_mg": 200,
                "magnesium_mg": 27,
                "sodium_mg": 59,
                "potassium_mg": 363,
                "chloride_mg": 90,
                "sulfur_mg": 250,
                # Trace minerals
                "iron_mg": 0.3,
                "zinc_mg": 0.4,
                "copper_mg": 0.05,
                "manganese_mg": 0.02,
                "iodine_mcg": 4.0,
                "selenium_mcg": 36.5,
                "chromium_mcg": 1.0,
                "molybdenum_mcg": 1.0,
                "fluoride_mg": 0.01
            },
            {
                "name": "Almonds, raw",
                "brand": "Generic",
                "upc": "000000000004",
                # Macronutrients
                "calories": 579,
                "protein_g": 21.2,
                "fat_g": 49.9,
                "carbs_g": 21.6,
                # Fat-soluble vitamins
                "vitamin_a_rae": 0,
                "vitamin_d_iu": 0,
                "vitamin_e_mg": 25.6,
                "vitamin_k_mcg": 0,
                # Water-soluble vitamins
                "vitamin_c_mg": 0,
                "vitamin_b1_mg": 0.21,  # Thiamin
                "vitamin_b2_mg": 1.14,  # Riboflavin
                "vitamin_b3_mg": 3.6,   # Niacin
                "vitamin_b5_mg": 0.47,  # Pantothenic Acid
                "vitamin_b6_mg": 0.14,  # Pyridoxine
                "vitamin_b7_mcg": 49.0,  # Biotin
                "vitamin_b9_mcg": 44.0,  # Folate
                "vitamin_b12_mcg": 0.0,  # Cobalamin
                "choline_mg": 52.1,
                # Macrominerals
                "calcium_mg": 269,
                "phosphorus_mg": 481,
                "magnesium_mg": 270,
                "sodium_mg": 1,
                "potassium_mg": 733,
                "chloride_mg": 39,
                "sulfur_mg": 150,
                # Trace minerals
                "iron_mg": 3.7,
                "zinc_mg": 3.1,
                "copper_mg": 1.03,
                "manganese_mg": 2.2,
                "iodine_mcg": 2.0,
                "selenium_mcg": 4.1,
                "chromium_mcg": 4.0,
                "molybdenum_mcg": 42.0,
                "fluoride_mg": 0.02
            },
            {
                "name": "Broccoli, raw",
                "brand": "Generic", 
                "upc": "000000000005",
                # Macronutrients
                "calories": 34,
                "protein_g": 2.8,
                "fat_g": 0.4,
                "carbs_g": 7.0,
                # Fat-soluble vitamins
                "vitamin_a_rae": 31,
                "vitamin_d_iu": 0,
                "vitamin_e_mg": 0.8,
                "vitamin_k_mcg": 102,
                # Water-soluble vitamins
                "vitamin_c_mg": 89.2,
                "vitamin_b1_mg": 0.07,  # Thiamin
                "vitamin_b2_mg": 0.12,  # Riboflavin
                "vitamin_b3_mg": 0.64,  # Niacin
                "vitamin_b5_mg": 0.57,  # Pantothenic Acid
                "vitamin_b6_mg": 0.18,  # Pyridoxine
                "vitamin_b7_mcg": 1.5,   # Biotin
                "vitamin_b9_mcg": 63.0,  # Folate
                "vitamin_b12_mcg": 0.0,  # Cobalamin
                "choline_mg": 18.7,
                # Macrominerals
                "calcium_mg": 47,
                "phosphorus_mg": 66,
                "magnesium_mg": 21,
                "sodium_mg": 33,
                "potassium_mg": 316,
                "chloride_mg": 43,
                "sulfur_mg": 130,
                # Trace minerals
                "iron_mg": 0.7,
                "zinc_mg": 0.4,
                "copper_mg": 0.05,
                "manganese_mg": 0.21,
                "iodine_mcg": 15.0,
                "selenium_mcg": 2.5,
                "chromium_mcg": 16.0,
                "molybdenum_mcg": 5.0,
                "fluoride_mg": 0.02
            }
        ]
        
        # Add foods to database
        for food_data in foods_data:
            existing_food = db.query(Food).filter(Food.upc == food_data["upc"]).first()
            if not existing_food:
                food = Food(**food_data)
                db.add(food)
                print(f"✅ Added {food_data['name']}")
            else:
                print(f"⏭️  {food_data['name']} already exists")
        
        # Commit changes
        db.commit()
        print("\n🎉 Database seeded successfully!")
        print(f"📊 Added {len(foods_data)} food items")
        print("👤 Demo user created (ID: 1)")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

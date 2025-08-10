"""
Manager for handling USDA food integration with local database.
"""
from sqlalchemy.orm import Session
from typing import Dict, Optional
from app.models import Food
from app.food_api import usda_api

class USDAFoodManager:
    """Manages the integration of USDA foods with local database."""
    
    def get_or_create_food(self, db: Session, usda_food_data: Dict) -> Food:
        """
        Get existing Food from local DB or create new one from USDA data.
        
        Args:
            db: Database session
            usda_food_data: Normalized USDA food data from food_api
            
        Returns:
            Food: Local database Food object
        """
        usda_fdc_id = abs(usda_food_data.get('id', 0))  # Remove negative sign
        
        # Check if we already have this USDA food in our local database
        existing_food = db.query(Food).filter(Food.usda_fdc_id == usda_fdc_id).first()
        if existing_food:
            return existing_food
        
        # Create new Food entry from USDA data
        food = Food(
            name=usda_food_data.get('name', 'Unknown Food'),
            brand=usda_food_data.get('brand', 'Generic'),
            upc=usda_food_data.get('upc', ''),
            
            # Nutrition data
            calories=usda_food_data.get('calories', 0),
            protein_g=usda_food_data.get('protein_g', 0),
            fat_g=usda_food_data.get('fat_g', 0),
            carbs_g=usda_food_data.get('carbs_g', 0),
            
            # Micronutrients
            vitamin_a_rae=usda_food_data.get('vitamin_a_rae', 0),
            vitamin_c_mg=usda_food_data.get('vitamin_c_mg', 0),
            vitamin_d_iu=usda_food_data.get('vitamin_d_iu', 0),
            vitamin_e_mg=usda_food_data.get('vitamin_e_mg', 0),
            vitamin_k_mcg=usda_food_data.get('vitamin_k_mcg', 0),
            calcium_mg=usda_food_data.get('calcium_mg', 0),
            iron_mg=usda_food_data.get('iron_mg', 0),
            magnesium_mg=usda_food_data.get('magnesium_mg', 0),
            zinc_mg=usda_food_data.get('zinc_mg', 0),
            potassium_mg=usda_food_data.get('potassium_mg', 0),
            sodium_mg=usda_food_data.get('sodium_mg', 0),
            
            # USDA metadata
            usda_fdc_id=usda_fdc_id,
            data_source='usda',
            publication_date=usda_food_data.get('publication_date', '')
        )
        
        db.add(food)
        db.commit()
        db.refresh(food)
        
        return food
    
    def get_food_by_usda_id(self, db: Session, usda_id: int) -> Optional[Food]:
        """Get a food by its USDA FDC ID."""
        usda_fdc_id = abs(usda_id)  # Remove negative sign
        return db.query(Food).filter(Food.usda_fdc_id == usda_fdc_id).first()
    
    def fetch_and_store_usda_food(self, db: Session, usda_id: int) -> Optional[Food]:
        """
        Fetch detailed food data from USDA API and store in local database.
        
        Args:
            db: Database session
            usda_id: USDA FoodData Central ID (can be negative)
            
        Returns:
            Food: Local database Food object or None if not found
        """
        usda_fdc_id = abs(usda_id)  # Remove negative sign
        
        # Check if already exists
        existing = self.get_food_by_usda_id(db, usda_fdc_id)
        if existing:
            return existing
        
        # Fetch from USDA API
        usda_food_raw = usda_api.get_food_details(usda_fdc_id)
        if not usda_food_raw:
            return None
        
        # Normalize and store
        usda_food_data = usda_api.normalize_food_data(usda_food_raw)
        usda_food_data['id'] = usda_fdc_id  # Ensure positive ID
        
        return self.get_or_create_food(db, usda_food_data)

# Global instance
usda_food_manager = USDAFoodManager()

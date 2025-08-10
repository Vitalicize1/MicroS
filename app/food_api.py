"""
USDA FoodData Central API integration for comprehensive food database access.
"""
import requests
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class USDAFoodAPI:
    def __init__(self):
        self.api_key = os.getenv('USDA_API_KEY', 'DEMO_KEY')
        self.base_url = 'https://api.nal.usda.gov/fdc/v1'
        # Simple in-memory cache to reduce API calls
        self._search_cache = {}
        self._detail_cache = {}
        
    def search_foods(self, query: str, page_size: int = 50, data_type: str = None) -> Dict:
        """
        Search for foods using USDA FoodData Central API
        
        Args:
            query: Search term (e.g., 'tofu', 'chicken breast')
            page_size: Number of results to return (max 200)
            data_type: Filter by data type ('Branded', 'Foundation', 'SR Legacy')
        
        Returns:
            Dict containing search results with foods array
        """
        url = f"{self.base_url}/foods/search"
        
        params = {
            'api_key': self.api_key,
            'query': query,
            'pageSize': min(page_size, 50),  # Allow up to 50 for more variety
            'sortBy': 'publishedDate',
            'sortOrder': 'desc',
            # Request more detailed nutrient data
            'nutrients': [1008, 1003, 1004, 1005],  # Energy, Protein, Fat, Carbs
        }
        
        # Prioritize Foundation and SR Legacy for basic foods, but include others for variety
        if not data_type:
            params['dataType'] = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']
        else:
            params['dataType'] = [data_type]
            
        # Check cache first
        cache_key = f"{query}_{page_size}_{data_type}"
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]
            
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            # For foods with limited data, try to get detailed info
            if 'foods' in result:
                enriched_foods = []
                for food in result['foods'][:30]:  # Limit to first 30 for better variety
                    # If this food has minimal nutrients, try to get detailed info
                    if len(food.get('foodNutrients', [])) < 5:
                        detailed_food = self.get_food_details(food.get('fdcId'))
                        if detailed_food and len(detailed_food.get('foodNutrients', [])) > len(food.get('foodNutrients', [])):
                            enriched_foods.append(detailed_food)
                        else:
                            enriched_foods.append(food)
                    else:
                        enriched_foods.append(food)
                
                result['foods'] = enriched_foods
            
            # Cache the result
            self._search_cache[cache_key] = result
            return result
        except requests.RequestException as e:
            print(f"Error searching USDA API: {e}")
            return {'foods': []}
    
    def get_food_details(self, fdc_id: int) -> Optional[Dict]:
        """
        Get detailed information for a specific food by FDC ID
        
        Args:
            fdc_id: Food Data Central ID
            
        Returns:
            Dict containing detailed food information
        """
        url = f"{self.base_url}/food/{fdc_id}"
        
        # Check cache first
        if fdc_id in self._detail_cache:
            return self._detail_cache[fdc_id]
            
        params = {
            'api_key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            # Cache the result
            self._detail_cache[fdc_id] = result
            return result
        except requests.RequestException as e:
            print(f"Error getting food details from USDA API: {e}")
            return None
    
    def _read_nutrient_value(self, item: Dict) -> (float, str, str):
        """Extract (value, unit, name) from a foodNutrients entry in both search and detail responses."""
        # Search results usually: nutrientId, nutrientName?, value, unitName
        # Detail results: nutrient: { id, name, unitName }, amount/value
        name = (
            (item.get('nutrient') or {}).get('name')
            or item.get('nutrientName')
            or ''
        )
        unit = (
            (item.get('nutrient') or {}).get('unitName')
            or item.get('unitName')
            or ''
        )
        value = item.get('amount')
        if value is None:
            value = item.get('value')
        try:
            value = float(value or 0)
        except Exception:
            value = 0.0
        return value, unit, name

    def _convert_unit(self, value: float, unit: str, target: str, nutrient_name: str = '') -> float:
        """Convert USDA unit to target (mg/mcg/IU). IU is returned as-is. Handles µg/mcg synonyms."""
        if value is None:
            return 0.0
        unit_u = (unit or '').lower()
        target_u = (target or '').lower()
        # Normalize ug/u00b5g/mcg
        if unit_u in ('µg', 'ug'):
            unit_u = 'mcg'
        if target_u in ('µg', 'ug'):
            target_u = 'mcg'
        # Same unit
        if unit_u == target_u:
            return float(value)
        # g to mg/mcg
        if unit_u == 'g' and target_u == 'mg':
            return float(value) * 1000.0
        if unit_u == 'g' and target_u == 'mcg':
            return float(value) * 1_000_000.0
        # mg <-> mcg
        if unit_u == 'mg' and target_u == 'mcg':
            return float(value) * 1000.0
        if unit_u == 'mcg' and target_u == 'mg':
            return float(value) / 1000.0
        # IU pass-through (we store vit D as IU)
        if target_u == 'iu':
            return float(value)
        # Unknown conversions: return value
        return float(value)

    def normalize_food_data(self, usda_food: Dict) -> Dict:
        """
        Convert USDA API food data to our internal format
        
        Args:
            usda_food: Raw food data from USDA API
            
        Returns:
            Dict in our internal food format
        """
        # Extract nutrients into a dict for easy lookup
        nutrients_by_id: Dict[int, float] = {}
        nutrients_by_name: Dict[str, Dict[str, float]] = {}
        if 'foodNutrients' in usda_food:
            for nutrient in usda_food['foodNutrients']:
                nid = nutrient.get('nutrientId')
                value, unit, name = self._read_nutrient_value(nutrient)
                if nid is not None:
                    try:
                        nutrients_by_id[int(nid)] = value
                    except Exception:
                        pass
                if name:
                    nutrients_by_name[name.lower()] = {
                        'value': value,
                        'unit': unit
                    }
                    
        # If we don't have basic nutrients, try to extract from other fields
        if not nutrients_by_id and 'labelNutrients' in usda_food:
            label_nutrients = usda_food['labelNutrients']
            # Map common label nutrients to our IDs
            if 'calories' in label_nutrients:
                nutrients_by_id[1008] = float(label_nutrients['calories'].get('value', 0))
            if 'protein' in label_nutrients:
                nutrients_by_id[1003] = float(label_nutrients['protein'].get('value', 0))
            if 'fat' in label_nutrients:
                nutrients_by_id[1004] = float(label_nutrients['fat'].get('value', 0))
            if 'carbohydrates' in label_nutrients:
                nutrients_by_id[1005] = float(label_nutrients['carbohydrates'].get('value', 0))
        
        # Map USDA nutrient IDs to our field names
        # Common nutrient IDs from USDA database
        nutrient_mapping = {
            1008: 'calories',           # Energy (kcal)
            1003: 'protein_g',          # Protein
            1004: 'fat_g',              # Total lipid (fat)
            1005: 'carbs_g',            # Carbohydrate, by difference
            1106: 'vitamin_a_rae',      # Vitamin A, RAE
            1162: 'vitamin_c_mg',       # Vitamin C, total ascorbic acid
            1114: 'vitamin_d_iu',       # Vitamin D (D2 + D3), International Units
            1109: 'vitamin_e_mg',       # Vitamin E (alpha-tocopherol)
            1185: 'vitamin_k_mcg',      # Vitamin K (phylloquinone)
            1087: 'calcium_mg',         # Calcium, Ca
            1089: 'iron_mg',            # Iron, Fe
            1090: 'magnesium_mg',       # Magnesium, Mg
            1095: 'zinc_mg',            # Zinc, Zn
            1092: 'potassium_mg',       # Potassium, K
            1093: 'sodium_mg',          # Sodium, Na
        }

        # Name-based mapping for extended micronutrients (fallback when IDs vary/missing)
        name_map = {
            'vitamin a, rae': ('vitamin_a_rae', 'mcg'),
            'vitamin c, total ascorbic acid': ('vitamin_c_mg', 'mg'),
            'vitamin d (d2 + d3), iu': ('vitamin_d_iu', 'iu'),
            'vitamin e (alpha-tocopherol)': ('vitamin_e_mg', 'mg'),
            'vitamin k (phylloquinone)': ('vitamin_k_mcg', 'mcg'),
            'thiamin': ('vitamin_b1_mg', 'mg'),
            'riboflavin': ('vitamin_b2_mg', 'mg'),
            'niacin': ('vitamin_b3_mg', 'mg'),
            'pantothenic acid': ('vitamin_b5_mg', 'mg'),
            'vitamin b-6': ('vitamin_b6_mg', 'mg'),
            'biotin': ('vitamin_b7_mcg', 'mcg'),
            'folate, total': ('vitamin_b9_mcg', 'mcg'),
            'vitamin b-12': ('vitamin_b12_mcg', 'mcg'),
            'choline, total': ('choline_mg', 'mg'),
            'phosphorus, p': ('phosphorus_mg', 'mg'),
            'copper, cu': ('copper_mg', 'mg'),
            'manganese, mn': ('manganese_mg', 'mg'),
            'iodine, i': ('iodine_mcg', 'mcg'),
            'selenium, se': ('selenium_mcg', 'mcg'),
            'chromium, cr': ('chromium_mcg', 'mcg'),
            'molybdenum, mo': ('molybdenum_mcg', 'mcg'),
            'fluoride, f': ('fluoride_mg', 'mg'),
            # Chloride and sulfur often absent; leave if not present
            'chloride, cl': ('chloride_mg', 'mg'),
            'sulfur, s': ('sulfur_mg', 'mg'),
        }
        
        # Build our normalized food object
        normalized = {
            'id': usda_food.get('fdcId'),
            'name': usda_food.get('description', 'Unknown Food'),
            'brand': usda_food.get('brandOwner') or usda_food.get('brandName') or 'Generic',
            'upc': usda_food.get('gtinUpc', ''),
            'data_type': usda_food.get('dataType', ''),
            'publication_date': usda_food.get('publicationDate', ''),
            'source': 'usda',
            'image_url': '',
        }
        
        # Add all nutrients with default values
        for nutrient_id, field_name in nutrient_mapping.items():
            normalized[field_name] = nutrients_by_id.get(nutrient_id, 0)

        # Fill extended micronutrients by name if present
        completeness = 0
        for key, val in normalized.items():
            if key in ('id', 'name', 'brand', 'upc', 'data_type', 'publication_date'):
                continue
            if isinstance(val, (int, float)) and val:
                completeness += 1

        for lname, (field, target_unit) in name_map.items():
            if field in normalized and normalized.get(field, 0):
                continue
            # find nutrient by name match
            for n_name, data in nutrients_by_name.items():
                if lname in n_name:
                    val = self._convert_unit(data['value'], data['unit'], target_unit, lname)
                    normalized[field] = val
                    if val:
                        completeness += 1
                    break

        normalized['completeness_score'] = completeness
            
        return normalized

# Global instance
usda_api = USDAFoodAPI()

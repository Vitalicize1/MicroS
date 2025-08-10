"""
Enhanced barcode scanning system with camera support and history tracking
"""
import requests
from typing import Optional, Dict, List
import json
from datetime import datetime

class BarcodeAPI:
    """Enhanced barcode lookup using multiple APIs"""
    
    def __init__(self):
        self.apis = [
            {
                'name': 'OpenFoodFacts',
                'url': 'https://world.openfoodfacts.org/api/v0/product/{upc}.json',
                'parser': self._parse_openfoodfacts
            },
            {
                'name': 'UPCDatabase',
                'url': 'https://api.upcitemdb.com/prod/trial/lookup',
                'parser': self._parse_upcitemdb
            }
        ]
        
    def lookup_product(self, upc: str) -> Optional[Dict]:
        """Lookup product by UPC using multiple APIs"""
        
        # Try OpenFoodFacts first (free, comprehensive)
        try:
            response = requests.get(
                f'https://world.openfoodfacts.org/api/v0/product/{upc}.json',
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:  # Product found
                    return self._parse_openfoodfacts(data)
        except Exception as e:
            print(f"OpenFoodFacts API error: {e}")
        
        # Fallback to UPC Item DB (if available)
        try:
            response = requests.get(
                'https://api.upcitemdb.com/prod/trial/lookup',
                params={'upc': upc},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('items'):
                    return self._parse_upcitemdb(data)
        except Exception as e:
            print(f"UPCItemDB API error: {e}")
            
        return None
        
    def _parse_openfoodfacts(self, data: Dict) -> Dict:
        """Parse OpenFoodFacts API response"""
        product = data.get('product', {})
        
        # Extract nutrition data (per 100g)
        nutriments = product.get('nutriments', {})
        
        return {
            'name': product.get('product_name', '').strip(),
            'brand': product.get('brands', '').split(',')[0].strip() if product.get('brands') else '',
            'categories': product.get('categories', ''),
            'ingredients': product.get('ingredients_text', ''),
            'serving_size': product.get('serving_size', ''),
            'image_url': product.get('image_url', ''),
            'nutrition': {
                'calories': nutriments.get('energy-kcal_100g', 0),
                'protein_g': nutriments.get('proteins_100g', 0),
                'fat_g': nutriments.get('fat_100g', 0),
                'carbs_g': nutriments.get('carbohydrates_100g', 0),
                'fiber_g': nutriments.get('fiber_100g', 0),
                'sugar_g': nutriments.get('sugars_100g', 0),
                'sodium_mg': nutriments.get('sodium_100g', 0) * 1000 if nutriments.get('sodium_100g') else 0,
                'vitamin_c_mg': nutriments.get('vitamin-c_100g', 0) * 1000 if nutriments.get('vitamin-c_100g') else 0,
                'calcium_mg': nutriments.get('calcium_100g', 0) * 1000 if nutriments.get('calcium_100g') else 0,
                'iron_mg': nutriments.get('iron_100g', 0) * 1000 if nutriments.get('iron_100g') else 0
            },
            'source': 'OpenFoodFacts'
        }
        
    def _parse_upcitemdb(self, data: Dict) -> Dict:
        """Parse UPCItemDB API response"""
        item = data.get('items', [{}])[0]
        
        return {
            'name': item.get('title', '').strip(),
            'brand': item.get('brand', '').strip(),
            'categories': '',
            'ingredients': '',
            'serving_size': '',
            'image_url': '',
            'nutrition': {
                'calories': 0, 'protein_g': 0, 'fat_g': 0, 'carbs_g': 0,
                'fiber_g': 0, 'sugar_g': 0, 'sodium_mg': 0,
                'vitamin_c_mg': 0, 'calcium_mg': 0, 'iron_mg': 0
            },
            'source': 'UPCItemDB'
        }

class BarcodeHistoryManager:
    """Manages barcode scan history and analytics"""
    
    def __init__(self):
        self.scan_cache = {}
        
    def record_scan(self, upc: str, success: bool, product_data: Optional[Dict] = None, user_id: int = 1):
        """Record a barcode scan attempt"""
        from app.models import BarcodeHistory
        from app.db import get_db
        
        try:
            db = next(get_db())
            
            history = BarcodeHistory(
                user_id=user_id,
                upc=upc,
                success=success,
                product_name=product_data.get('name') if product_data else None,
                brand=product_data.get('brand') if product_data else None,
                source=product_data.get('source') if product_data else None
            )
            db.add(history)
            db.commit()
            
            # Cache successful scans
            if success and product_data:
                self.scan_cache[upc] = product_data
                
        except Exception as e:
            print(f"Error recording scan history: {e}")
            
    def get_scan_history(self, user_id: int = 1, limit: int = 50) -> List[Dict]:
        """Get recent barcode scan history"""
        from app.models import BarcodeHistory
        from app.db import get_db
        
        try:
            db = next(get_db())
            
            history = db.query(BarcodeHistory).filter(
                BarcodeHistory.user_id == user_id
            ).order_by(
                BarcodeHistory.scanned_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    'upc': h.upc,
                    'product_name': h.product_name,
                    'brand': h.brand,
                    'success': h.success,
                    'source': h.source,
                    'scanned_at': h.scanned_at.isoformat()
                }
                for h in history
            ]
        except Exception as e:
            print(f"Error getting scan history: {e}")
            return []
        
    def get_popular_products(self, limit: int = 20) -> List[Dict]:
        """Get most frequently scanned products"""
        from app.models import BarcodeHistory
        from app.db import get_db
        from sqlalchemy import func
        
        try:
            db = next(get_db())
            
            popular = db.query(
                BarcodeHistory.upc,
                BarcodeHistory.product_name,
                BarcodeHistory.brand,
                func.count(BarcodeHistory.upc).label('scan_count')
            ).filter(
                BarcodeHistory.success == True
            ).group_by(
                BarcodeHistory.upc
            ).order_by(
                func.count(BarcodeHistory.upc).desc()
            ).limit(limit).all()
            
            return [
                {
                    'upc': p.upc,
                    'product_name': p.product_name,
                    'brand': p.brand,
                    'scan_count': p.scan_count
                }
                for p in popular
            ]
        except Exception as e:
            print(f"Error getting popular products: {e}")
            return []

# Global instances
barcode_api = BarcodeAPI()
barcode_history = BarcodeHistoryManager()

def validate_upc(upc: str) -> bool:
    """Enhanced UPC validation"""
    if not upc:
        return False
        
    # Remove any non-digit characters
    upc = ''.join(filter(str.isdigit, upc))
    
    # Support both UPC-A (12 digits) and EAN-13 (13 digits)
    if len(upc) not in [12, 13]:
        return False
    
    try:
        digits = [int(d) for d in upc]
        
        if len(upc) == 12:  # UPC-A
            check_sum = sum(digits[i] * (3 if i % 2 == 0 else 1) for i in range(11))
            check_digit = (10 - (check_sum % 10)) % 10
            return check_digit == digits[11]
        else:  # EAN-13
            check_sum = sum(digits[i] * (1 if i % 2 == 0 else 3) for i in range(12))
            check_digit = (10 - (check_sum % 10)) % 10
            return check_digit == digits[12]
            
    except (ValueError, IndexError):
        return False

def decode_barcode_image(image_data: bytes) -> Optional[str]:
    """
    Decode barcode from image data using pyzbar
    """
    try:
        from pyzbar.pyzbar import decode
        from PIL import Image
        import io
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Decode barcodes
        decoded_objects = decode(image)
        
        if decoded_objects:
            # Return the first valid barcode found
            for obj in decoded_objects:
                barcode_data = obj.data.decode('utf-8')
                if validate_upc(barcode_data):
                    return barcode_data
                    
        return None
        
    except ImportError:
        print("pyzbar not available - install with: pip install pyzbar")
        return None
    except Exception as e:
        print(f"Error decoding barcode: {e}")
        return None

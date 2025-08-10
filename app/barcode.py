from typing import List, Optional
from sqlalchemy.orm import Session
from .models import Food

def lookup_upc(db: Session, upc: str) -> List[Food]:
    """Lookup food by UPC code"""
    return db.query(Food).filter(Food.upc == upc).all()

def search_food_by_name(db: Session, query: str, limit: int = 5) -> List[Food]:
    """Search food by name using partial match"""
    return db.query(Food).filter(
        Food.name.ilike(f"%{query}%")
    ).limit(limit).all()

def decode_barcode_image(image_path: str) -> Optional[str]:
    """
    Decode barcode from image using pyzbar
    TODO: Implement actual image decoding
    """
    try:
        from pyzbar.pyzbar import decode
        from PIL import Image
        
        image = Image.open(image_path)
        decoded_objects = decode(image)
        
        if decoded_objects:
            return decoded_objects[0].data.decode('utf-8')
        return None
    except ImportError:
        print("pyzbar not available for image decoding")
        return None
    except Exception as e:
        print(f"Error decoding barcode: {e}")
        return None

def validate_upc(upc: str) -> bool:
    """Basic UPC validation"""
    if not upc or len(upc) != 12:
        return False
    
    try:
        digits = [int(d) for d in upc]
        # Simple check digit validation
        check_sum = sum(digits[i] * (3 if i % 2 == 0 else 1) for i in range(11))
        check_digit = (10 - (check_sum % 10)) % 10
        return check_digit == digits[11]
    except ValueError:
        return False

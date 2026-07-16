import time
from typing import Any, Optional, Dict

class CacheService:
    _cache: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        entry = cls._cache.get(key)
        if not entry:
            return None
            
        if entry['expires_at'] < time.time():
            del cls._cache[key]
            return None
            
        return entry['value']
        
    @classmethod
    def set(cls, key: str, value: Any, ttl_seconds: int = 300) -> None:
        cls._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl_seconds
        }
        
    @classmethod
    def clear(cls, pattern: str = None) -> None:
        if not pattern:
            cls._cache.clear()
        else:
            keys_to_delete = [k for k in cls._cache.keys() if pattern in k]
            for k in keys_to_delete:
                del cls._cache[k]

    @classmethod
    def build_key(cls, base: str, **kwargs) -> str:
        parts = [f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None]
        return f"{base}:{':'.join(parts)}"

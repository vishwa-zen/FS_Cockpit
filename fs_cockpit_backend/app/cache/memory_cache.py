"""
Thread-safe in-memory cache with TTL support.

This module provides a production-grade in-memory cache implementation
with the following features:
- TTL (Time To Live) support with automatic expiration
- LRU eviction when max size is reached
- Thread-safe operations using locks
- Cache statistics (hits, misses, hit rate)
- Automatic cleanup of expired entries
- Memory efficient with configurable limits
"""

from datetime import datetime, timedelta
from threading import RLock
from typing import Any, Dict, Optional, Tuple

import structlog

logger = structlog.get_logger(__name__)


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL and LRU eviction.

    Features:
    - Automatic expiration based on TTL
    - Size limits with LRU eviction
    - Thread-safe for concurrent access
    - Statistics tracking (hits, misses, evictions)
    - Cleanup utilities for expired entries

    Example:
        cache = InMemoryCache(max_size=1000)
        cache.set("key", {"data": "value"}, ttl_seconds=300)
        value = cache.get("key")  # Returns {"data": "value"} or None
    """

    def __init__(self, max_size: int = 10000):
        """
        Initialize cache with maximum size.

        Args:
            max_size: Maximum number of cache entries (default 10,000)
        """
        self._cache: Dict[str, Tuple[Any, datetime, datetime]] = (
            {}
        )  # key -> (value, expiry, created)
        self._lock = RLock()  # Thread-safe operations
        self._max_size = max_size

        # Statistics
        self._hits = 0
        self._misses = 0
        self._evictions = 0
        self._sets = 0

        logger.info("InMemoryCache initialized", max_size=max_size)

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if exists and not expired.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key in self._cache:
                value, expiry, _ = self._cache[key]

                if datetime.now() < expiry:
                    self._hits += 1
                    logger.debug("Cache hit", key=key)
                    return value
                else:
                    # Expired - remove it
                    del self._cache[key]
                    logger.debug("Cache expired", key=key)

            self._misses += 1
            logger.debug("Cache miss", key=key)
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """
        Store value in cache with expiration time.

        Args:
            key: Cache key
            value: Value to cache (must be serializable)
            ttl_seconds: Time to live in seconds (default 5 minutes)
        """
        with self._lock:
            # Check if we're at capacity and need to evict
            if len(self._cache) >= self._max_size and key not in self._cache:
                self._evict_lru()

            expiry = datetime.now() + timedelta(seconds=ttl_seconds)
            created = datetime.now()
            self._cache[key] = (value, expiry, created)
            self._sets += 1

            logger.debug("Cache set", key=key, ttl=ttl_seconds, size=len(self._cache))

    def delete(self, key: str) -> bool:
        """
        Remove specific key from cache.

        Args:
            key: Cache key to remove

        Returns:
            True if key existed and was deleted, False otherwise
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug("Cache key deleted", key=key)
                return True
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern (contains substring).

        Args:
            pattern: String pattern to match in keys

        Returns:
            Number of keys deleted
        """
        with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]

            if keys_to_delete:
                logger.info("Cache pattern delete", pattern=pattern, count=len(keys_to_delete))

            return len(keys_to_delete)

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info("Cache cleared", entries_removed=count)

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.

        Returns:
            Number of expired entries removed
        """
        with self._lock:
            now = datetime.now()
            expired_keys = [key for key, (_, expiry, _) in self._cache.items() if now >= expiry]

            for key in expired_keys:
                del self._cache[key]

            if expired_keys:
                logger.info("Cache cleanup completed", expired_entries=len(expired_keys))

            return len(expired_keys)

    def _evict_lru(self) -> None:
        """
        Evict oldest 10% of entries when cache is full (LRU-like).
        Uses creation time to determine oldest entries.
        """
        if not self._cache:
            return

        # Sort by creation time (oldest first)
        sorted_items = sorted(
            self._cache.items(), key=lambda x: x[1][2]  # Sort by created timestamp
        )

        # Evict oldest 10% (minimum 1 entry)
        evict_count = max(1, len(sorted_items) // 10)

        for key, _ in sorted_items[:evict_count]:
            del self._cache[key]
            self._evictions += 1

        logger.info("Cache LRU eviction", evicted=evict_count, remaining=len(self._cache))

    def stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "usage_percent": round(len(self._cache) / self._max_size * 100, 2),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 2),
                "evictions": self._evictions,
                "total_sets": self._sets,
                "total_requests": total_requests,
            }

    def size(self) -> int:
        """Get current number of entries in cache."""
        with self._lock:
            return len(self._cache)

    def reset_stats(self) -> None:
        """Reset statistics counters."""
        with self._lock:
            self._hits = 0
            self._misses = 0
            self._evictions = 0
            self._sets = 0
            logger.info("Cache statistics reset")


# Global singleton cache instance
_cache_instance: Optional[InMemoryCache] = None


def get_cache() -> InMemoryCache:
    """
    Get the global cache instance (singleton pattern).

    Returns:
        Global InMemoryCache instance
    """
    global _cache_instance

    if _cache_instance is None:
        from app.config.settings import get_settings

        settings = get_settings()

        # Initialize with configured max size
        max_size = getattr(settings, "CACHE_MAX_SIZE", 10000)
        _cache_instance = InMemoryCache(max_size=max_size)

        logger.info("Global cache instance created", max_size=max_size)

    return _cache_instance


def reset_cache() -> None:
    """
    Reset the global cache instance (mainly for testing).
    This will create a new empty cache.
    """
    global _cache_instance
    _cache_instance = None
    logger.info("Global cache instance reset")

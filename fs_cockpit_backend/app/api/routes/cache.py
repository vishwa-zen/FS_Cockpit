"""Cache management API endpoints."""

from typing import Any, Dict

import structlog
from fastapi import APIRouter, HTTPException

from app.cache.memory_cache import get_cache

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/cache", tags=["Cache Management"])


@router.get("/stats", summary="Get Cache Statistics")
async def get_cache_stats() -> Dict[str, Any]:
    """
    Get comprehensive cache statistics including hits, misses, and hit rate.

    Returns:
        dict: Cache statistics
    """
    try:
        cache = get_cache()
        stats = cache.stats()

        logger.info("Cache statistics retrieved", **stats)
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error("Failed to get cache statistics", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get cache statistics: {str(e)}")


@router.delete("/clear", summary="Clear All Cache")
async def clear_cache() -> Dict[str, str]:
    """
    Clear all cache entries. Use with caution in production.

    Returns:
        dict: Success message
    """
    try:
        cache = get_cache()
        cache.clear()

        logger.warning("Cache cleared manually")
        return {"status": "success", "message": "All cache entries cleared successfully"}
    except Exception as e:
        logger.error("Failed to clear cache", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.delete("/key/{key:path}", summary="Delete Specific Cache Key")
async def delete_cache_key(key: str) -> Dict[str, Any]:
    """
    Delete a specific cache key.

    Args:
        key: The cache key to delete

    Returns:
        dict: Success status and message
    """
    try:
        cache = get_cache()
        deleted = cache.delete(key)

        if deleted:
            logger.info("Cache key deleted", key=key)
            return {
                "status": "success",
                "message": f"Cache key '{key}' deleted successfully",
                "deleted": True,
            }
        else:
            logger.debug("Cache key not found", key=key)
            return {
                "status": "success",
                "message": f"Cache key '{key}' not found",
                "deleted": False,
            }
    except Exception as e:
        logger.error("Failed to delete cache key", key=key, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete cache key: {str(e)}")


@router.delete("/pattern/{pattern}", summary="Delete Cache Keys by Pattern")
async def delete_cache_pattern(pattern: str) -> Dict[str, Any]:
    """
    Delete all cache keys containing the specified pattern.

    Args:
        pattern: String pattern to match in cache keys

    Returns:
        dict: Number of keys deleted
    """
    try:
        cache = get_cache()
        deleted_count = cache.delete_pattern(pattern)

        logger.info("Cache pattern deleted", pattern=pattern, count=deleted_count)
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} cache entries matching pattern '{pattern}'",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        logger.error("Failed to delete cache pattern", pattern=pattern, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete cache pattern: {str(e)}")


@router.post("/cleanup", summary="Cleanup Expired Entries")
async def cleanup_expired() -> Dict[str, Any]:
    """
    Manually trigger cleanup of expired cache entries.

    Returns:
        dict: Number of expired entries removed
    """
    try:
        cache = get_cache()
        removed_count = cache.cleanup_expired()

        logger.info("Manual cache cleanup completed", removed=removed_count)
        return {
            "status": "success",
            "message": f"Removed {removed_count} expired cache entries",
            "removed_count": removed_count,
        }
    except Exception as e:
        logger.error("Failed to cleanup expired entries", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to cleanup expired entries: {str(e)}")


@router.post("/reset-stats", summary="Reset Cache Statistics")
async def reset_cache_stats() -> Dict[str, str]:
    """
    Reset cache statistics counters (hits, misses, evictions).
    Does not clear cached data.

    Returns:
        dict: Success message
    """
    try:
        cache = get_cache()
        cache.reset_stats()

        logger.info("Cache statistics reset")
        return {"status": "success", "message": "Cache statistics reset successfully"}
    except Exception as e:
        logger.error("Failed to reset cache statistics", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to reset cache statistics: {str(e)}")

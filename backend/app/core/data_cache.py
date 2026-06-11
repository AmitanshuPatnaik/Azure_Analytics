"""
data_cache.py
─────────────
Thread-safe in-memory data cache implemented as a Python Singleton.

All FastAPI endpoint handlers read directly from this cache.
The background SyncWorker writes into it on a 2-hour cadence.

Design guarantees:
  • Never raises on a missing key — callers always receive a safe default.
  • Cache values are NEVER cleared or reset to None/[] on a failed sync.
    Stale data is always preferred over an empty response.
  • All reads and writes are protected by a single threading.RLock so the
    module is safe for concurrent use across multiple uvicorn worker threads.
"""

import threading
import logging

logger = logging.getLogger(__name__)


class _DataCache:
    """
    Singleton in-memory store for pre-fetched Azure & Azure DevOps payloads.

    Access the singleton via the module-level `cache` object:
        from core.data_cache import cache

    """

    _instance = None
    _instance_lock = threading.Lock()

    # ------------------------------------------------------------------ #
    #  Singleton construction                                              #
    # ------------------------------------------------------------------ #

    def __new__(cls):
        # Double-checked locking so only one instance is ever created,
        # even under heavy concurrent import pressure at startup.
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._lock = threading.RLock()
                    instance._store: dict = {}
                    cls._instance = instance
        return cls._instance

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def get(self, key: str, default=None):
        """
        Return the cached value for *key*, or *default* if the key has
        never been written.  Never raises.
        """
        with self._lock:
            return self._store.get(key, default)

    def set(self, key: str, value) -> None:
        """
        Atomically write *value* for *key*.  Overwrites any existing value.
        This is the ONLY method that may update the store — do not write
        to _store directly.
        """
        with self._lock:
            self._store[key] = value
            logger.debug("[DataCache] Written key=%r (type=%s)", key, type(value).__name__)

    def has(self, key: str) -> bool:
        """Return True if *key* exists in the cache (value may be falsy)."""
        with self._lock:
            return key in self._store

    def keys(self) -> list:
        """Return a snapshot list of all keys currently in the cache."""
        with self._lock:
            return list(self._store.keys())

    def stats(self) -> dict:
        """
        Return a lightweight status dict suitable for health-check endpoints.
        Contains the worker status, last sync time, and all cached key names.
        """
        with self._lock:
            return {
                "worker_status": self._store.get("worker_status", "not_started"),
                "last_sync_time": self._store.get("last_sync_time", None),
                "cached_keys": [k for k in self._store if k not in ("worker_status", "last_sync_time")],
            }


# ─────────────────────────────────────────────────────────────────────────── #
#  Module-level singleton — import this everywhere                            #
# ─────────────────────────────────────────────────────────────────────────── #
cache = _DataCache()

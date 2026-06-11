"""
sync_worker.py
──────────────
Background daemon thread that periodically syncs live Azure & Azure DevOps
data into the local in-memory cache (data_cache.py) with open-validation protection.
"""

import logging
import threading
import time
from datetime import datetime, timezone

<<<<<<< HEAD
from app.core.data_cache import cache

# ── Service imports ──────────────────────────────────────────────────────── #
from app.services.Azure_Devops.projects_service import fetch_projects
from app.services.Azure_Devops.repositories_service import fetch_all_repositories
from app.services.Azure.subscriptions import fetch_subscriptions
from app.services.Azure.costs import (
=======
from core.data_cache import cache

# ── Service imports ──────────────────────────────────────────────────────── #
from services.Azure_Devops.projects_service import fetch_projects
from services.Azure_Devops.repositories_service import fetch_all_repositories
from services.Azure.subscriptions import fetch_subscriptions
from services.Azure.costs import (
>>>>>>> 81abce3 (Modified Backend imports)
    fetch_total_cost,
    fetch_resource_group_costs,
    fetch_service_costs,
    fetch_top_resources,
    fetch_budgets,
    fetch_yearly_costs,
    fetch_aggregated_monthly_costs
    # fetch_monthly_costs
)

logger = logging.getLogger(__name__)

SYNC_INTERVAL_SECONDS: int = 7_200   # 2 hours


def _sync_projects() -> None:
    try:
        result = fetch_projects()
        if isinstance(result, dict) and result.get("success", True):
            cache.set("projects", result)
            logger.info("[SyncWorker] ✓ projects cached (%d entries)", len(result.get("projects", [])))
    except Exception as exc:
        logger.warning("[SyncWorker] ✗ projects sync failed: %s", exc)


def _sync_repos() -> None:
    try:
        result = fetch_all_repositories()
        if isinstance(result, dict) and result.get("success", True):
            cache.set("repos", result)
            logger.info("[SyncWorker] ✓ repos cached (%d entries)", len(result.get("repositories", [])))
    except Exception as exc:
        logger.warning("[SyncWorker] ✗ repos sync failed: %s", exc)


def _sync_subscriptions() -> list:
    try:
        result = fetch_subscriptions()
        if isinstance(result, dict) and not result.get("error"):
            cache.set("subscriptions", result)
            subs = result.get("subscriptions", [])
            logger.info("[SyncWorker] ✓ subscriptions cached (%d entries)", len(subs))
            return [s.get("subscriptionId") for s in subs if isinstance(s, dict) and s.get("subscriptionId")]
    except Exception as exc:
        logger.warning("[SyncWorker] ✗ subscriptions sync failed: %s", exc)
    return []


def _sync_cost_trend() -> None:
    try:
        result = fetch_aggregated_monthly_costs()
        if isinstance(result, dict) and result.get("success"):
            cache.set("costs:trend", result)
            logger.info("[SyncWorker] ✓ cost trend analytics timeline cached successfully")
    except Exception as exc:
        logger.warning("[SyncWorker] ✗ cost trend sync failed: %s", exc)


def _sync_costs_for_subscription(sub_id: str) -> None:
    """
    Fetch all cost payloads for a single subscription and commit them to cache
    under structured keys protected by a performance-safe execution delay.
    """
    # ── MTD total cost ───────────────────────────────────────────────────── #
    try:
        result = fetch_total_cost(sub_id)
        if isinstance(result, dict) and result.get("success"):
            cache.set(f"costs:{sub_id}", result)
            cache.set(f"total:{sub_id}", result)
            logger.info("[SyncWorker] costs+total cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] costs sync failed for sub=%s: %s", sub_id, exc)

    # ── Resource group breakdown ─────────────────────────────────────────── #
    try:
        result = fetch_resource_group_costs(sub_id)
        if isinstance(result, dict) and result.get("success"):
            cache.set(f"resourcegroups:{sub_id}", result)
            logger.info("[SyncWorker] resourcegroups cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] resourcegroups sync failed for sub=%s: %s", sub_id, exc)

    # ── Service allocation breakdown ─────────────────────────────────────── #
    try:
        result = fetch_service_costs(sub_id)
        if isinstance(result, dict) and result.get("success"):
            cache.set(f"services:{sub_id}", result)
            logger.info("[SyncWorker] services cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] services sync failed for sub=%s: %s", sub_id, exc)

    # ── Top high-spending resources ──────────────────────────────────────── #
    try:
        result = fetch_top_resources(sub_id)
        # Verify the payload structure is successful and contains valid items before committing to memory
        if isinstance(result, dict) and result.get("success") and result.get("top_resources"):
            cache.set(f"topresources:{sub_id}", result)
            logger.info("[SyncWorker] ✓ topresources successfully validated and cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] topresources sync failed for sub=%s: %s", sub_id, exc)

    # ── Budget thresholds ────────────────────────────────────────────────── #
    try:
        result = fetch_budgets(sub_id)
        if isinstance(result, dict) and result.get("success"):
            cache.set(f"budgets:{sub_id}", result)
            logger.info("[SyncWorker] budgets cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] budgets sync failed for sub=%s: %s", sub_id, exc)

    # ── Year-to-date cost breakdown ──────────────────────────────────────── #
    try:
        result = fetch_yearly_costs(sub_id)
        if isinstance(result, dict) and result.get("success") and result.get("yearly_cost", 0) > 0:
            cache.set(f"yearly:{sub_id}", result)
            logger.info("[SyncWorker] yearly costs cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] yearly sync failed for sub=%s: %s", sub_id, exc)

    # ── 🎯 HISTORICAL MONTHLY TREND MATRICES (The Graph Fix) ─────────────── #
    try:
        result = fetch_monthly_costs(sub_id)
        if isinstance(result, dict) and result.get("success") and result.get("rows"):
            cache.set(f"monthly:{sub_id}", result)
            logger.info("[SyncWorker] ✓ historical monthly intervals cached for sub=%s", sub_id)
    except Exception as exc:
        logger.warning("[SyncWorker] historical trend lines sync failed for sub=%s: %s", sub_id, exc)

    # 🛡️ ANTI-THROTTLING RATE GATEWAY GATE
    # Staggers execution loops by 1.5 seconds to protect backend thread pool from API limits
    time.sleep(1.5)

def run_sync() -> None:
    logger.info("[SyncWorker] ── Starting sync sweep ──────────────────────────")
    cache.set("worker_status", "running")

    try:
        _sync_projects()
        _sync_repos()
        sub_ids = _sync_subscriptions()

        if sub_ids:
            for sub_id in sub_ids:
                _sync_costs_for_subscription(sub_id)
            _sync_cost_trend()
        else:
            logger.info("[SyncWorker] No active subscriptions found — skipping cost matrix sync")

        now_utc = datetime.now(timezone.utc).isoformat()
        cache.set("last_sync_time", now_utc)
        cache.set("worker_status", "idle")
        logger.info("[SyncWorker] ── Sync completed successfully at %s ──", now_utc)

    except Exception as exc:
        cache.set("worker_status", f"error:{exc}")
        logger.error("[SyncWorker] ✗ Unexpected sweep failure: %s", exc)


class SyncWorker(threading.Thread):
    def __init__(self):
        super().__init__(name="AzureSyncWorker", daemon=True)
        self._stop_event = threading.Event()

    def run(self) -> None:
        logger.info("[SyncWorker] Daemon thread active.")
        run_sync()

        elapsed = 0
        while not self._stop_event.is_set():
            time.sleep(1)
            elapsed += 1
            if elapsed >= SYNC_INTERVAL_SECONDS:
                elapsed = 0
                run_sync()
        logger.info("[SyncWorker] Daemon thread stopping gracefully.")

    def stop(self) -> None:
        self._stop_event.set()
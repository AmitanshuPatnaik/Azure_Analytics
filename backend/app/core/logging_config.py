"""
logging_config.py
─────────────────
Centralised logging bootstrap for the Azure Analytics API.

All log files are stored under:
    backend/app/logs/

Log files rotate at 10 MB with a maximum of 5 backups to prevent unbounded
disk growth during long-running deployments.

Usage (call once at startup in main.py):
    from core.logging_config import setup_logging
    setup_logging()

All other modules simply use:
    import logging
    logger = logging.getLogger(__name__)
"""

import logging
import logging.handlers
import os
import sys

# ── Paths ────────────────────────────────────────────────────────────────────

# Resolve the logs directory relative to this file:
# backend/app/core/logging_config.py  →  backend/app/logs/
_LOGS_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
_LOGS_DIR = os.path.normpath(_LOGS_DIR)

# Log file names
_APP_LOG_FILE   = os.path.join(_LOGS_DIR, "app.log")      # General application log
_ERROR_LOG_FILE = os.path.join(_LOGS_DIR, "errors.log")   # Errors and above only

# ── Format ───────────────────────────────────────────────────────────────────

_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ── Sentinel ─────────────────────────────────────────────────────────────────

_logging_configured = False


def setup_logging(level: int = logging.INFO) -> None:
    """
    Configure the root logger once per process lifetime.

    Handlers added:
      1. StreamHandler  → stdout (console)
      2. RotatingFileHandler → app/logs/app.log    (all levels ≥ INFO)
      3. RotatingFileHandler → app/logs/errors.log (WARNING and above only)

    Calling this more than once is safe — subsequent calls are no-ops.
    """
    global _logging_configured
    if _logging_configured:
        return
    _logging_configured = True

    # Ensure the logs directory exists
    try:
        os.makedirs(_LOGS_DIR, exist_ok=True)
    except OSError as exc:
        print(f"[logging_config] WARNING: Could not create logs directory '{_LOGS_DIR}': {exc}", file=sys.stderr)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    # ── 1. Console handler (UTF-8 safe for Windows CP-1252 terminals) ─────── #
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    # Reconfigure stdout to UTF-8 if possible (Python 3.7+)
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except AttributeError:
        pass  # Not available in all environments; non-fatal

    # ── 2. Rotating file handler: all INFO+ events → app.log ────────────── #
    try:
        file_handler = logging.handlers.RotatingFileHandler(
            _APP_LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10 MB per file
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
    except OSError as exc:
        print(f"[logging_config] WARNING: Could not open log file '{_APP_LOG_FILE}': {exc}", file=sys.stderr)
        file_handler = None

    # ── 3. Rotating file handler: WARNING+ only → errors.log ─────────────── #
    try:
        error_handler = logging.handlers.RotatingFileHandler(
            _ERROR_LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10 MB per file
            backupCount=5,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.WARNING)
        error_handler.setFormatter(formatter)
    except OSError as exc:
        print(f"[logging_config] WARNING: Could not open error log file '{_ERROR_LOG_FILE}': {exc}", file=sys.stderr)
        error_handler = None

    # ── Attach handlers to root logger ──────────────────────────────────── #
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(console_handler)
    if file_handler:
        root_logger.addHandler(file_handler)
    if error_handler:
        root_logger.addHandler(error_handler)

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "[LoggingConfig] Logging initialised. app.log -> %s | errors.log -> %s",
        _APP_LOG_FILE,
        _ERROR_LOG_FILE,
    )

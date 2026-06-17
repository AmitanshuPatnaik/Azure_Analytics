import logging
import logging.handlers
import os
import sys


# Resolve the logs directory relative to this file:
# backend/app/core/logging_config.py  →  backend/app/logs/
_LOGS_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
_LOGS_DIR = os.path.normpath(_LOGS_DIR)

# Log file names
_APP_LOG_FILE   = os.path.join(_LOGS_DIR, "app.log")      # General application log
_ERROR_LOG_FILE = os.path.join(_LOGS_DIR, "errors.log")   # Errors and above only


_LOG_FORMAT = ("%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s")
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


_logging_configured = False


def setup_logging(level: int = logging.INFO) -> None:
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

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    # Reconfigure stdout to UTF-8 if possible (Python 3.7+)
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except AttributeError:
        pass  # Not available in all environments; non-fatal

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

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(console_handler)
    if file_handler:
        root_logger.addHandler(file_handler)
    if error_handler:
        root_logger.addHandler(error_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "[LoggingConfig] Logging initialised. app.log -> %s | errors.log -> %s",
        _APP_LOG_FILE,
        _ERROR_LOG_FILE,
    )
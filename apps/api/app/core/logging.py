"""Structured logging with conservative field allowlisting."""

import json
import logging
from typing import Any


LOGGER = logging.getLogger("codeology.api")


def log_event(event: str, **fields: Any) -> None:
    """Emit only safe operational fields; callers cannot include body data."""

    allowed = {"request_id", "method", "path", "status_code", "latency_ms"}
    record = {"event": event, **{key: value for key, value in fields.items() if key in allowed}}
    LOGGER.info(json.dumps(record, sort_keys=True))

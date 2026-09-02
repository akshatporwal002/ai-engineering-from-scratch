"""Small per-principal fixed-window abuse boundary for a single API instance."""

from collections import defaultdict, deque
from time import monotonic

from app.core.errors import ApiError


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self.limit, self.window = limit, window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = monotonic()
        values = self._requests[key]
        while values and values[0] <= now - self.window:
            values.popleft()
        if len(values) >= self.limit:
            raise ApiError("rate_limited", "Too many requests. Try again shortly.", 429)
        values.append(now)

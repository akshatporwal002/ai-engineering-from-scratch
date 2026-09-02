"""Request ID generation and validation."""

from uuid import UUID, uuid4


def request_id_from(value: str | None) -> str:
    """Accept only UUID request IDs, otherwise create a fresh correlation ID."""

    if value:
        try:
            return str(UUID(value))
        except ValueError:
            pass
    return str(uuid4())

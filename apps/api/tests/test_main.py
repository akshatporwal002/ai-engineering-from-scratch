import io
import logging
import unittest
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.logging import LOGGER, log_event
from app.main import create_app


class ApiFoundationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(create_app())

    def test_health_is_enveloped(self) -> None:
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["code"], "ok")
        UUID(response.json()["request_id"])

    def test_readiness_and_version_are_available(self) -> None:
        self.assertEqual(self.client.get("/api/v1/readiness").json()["message"], "ready")
        self.assertEqual(self.client.get("/api/v1/version").json()["message"], "version")

    def test_request_id_is_propagated(self) -> None:
        request_id = "f0b48a00-e3aa-4c9d-a209-6dc7c354a111"
        response = self.client.get("/api/v1/health", headers={"x-request-id": request_id})
        self.assertEqual(response.headers["x-request-id"], request_id)
        self.assertEqual(response.json()["request_id"], request_id)

    def test_unknown_route_uses_safe_error_envelope(self) -> None:
        response = self.client.get("/api/v1/not-a-route")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "route_not_found")
        self.assertNotIn("detail", response.json())

    def test_log_event_redacts_unallowlisted_values(self) -> None:
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        LOGGER.addHandler(handler)
        LOGGER.setLevel(logging.INFO)
        try:
            log_event("request.completed", request_id="safe", path="/api/v1/health", body="private CV", authorization="Bearer secret", cookies="session=private")
        finally:
            LOGGER.removeHandler(handler)
        output = stream.getvalue()
        self.assertIn("safe", output)
        self.assertNotIn("private CV", output)
        self.assertNotIn("Bearer secret", output)
        self.assertNotIn("session=private", output)


if __name__ == "__main__":
    unittest.main()

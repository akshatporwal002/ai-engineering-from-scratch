import io
import logging
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.logging import LOGGER, log_event
from app.main import create_app
from scripts.generate_contracts import OPENAPI_PATH, TYPES_PATH, render_contracts


class ContractTests(unittest.TestCase):
    def test_generated_contracts_have_no_drift(self):
        openapi, typescript = render_contracts()
        self.assertEqual(OPENAPI_PATH.read_text(encoding="utf-8"), openapi)
        self.assertEqual(TYPES_PATH.read_text(encoding="utf-8"), typescript)

    def test_openapi_contains_application_routes(self):
        paths = create_app().openapi()["paths"]
        for path in ["/api/v1/progress/reconcile", "/api/v1/providers", "/api/v1/cv/documents", "/api/v1/cv/documents/{document_id}/analyses"]:
            self.assertIn(path, paths)

    def test_http_errors_and_logs_never_expose_sensitive_values(self):
        client = TestClient(create_app())
        response = client.post("/api/v1/providers", json={"provider_id": "openai", "model_id": "gpt-5-mini", "credential": "real-looking-secret"})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("real-looking-secret", response.text)
        stream, handler = io.StringIO(), logging.StreamHandler()
        handler.setStream(stream)
        LOGGER.addHandler(handler)
        try:
            log_event("unsafe", cv_text="private cv", prompt="private prompt", provider_response="private response", credential="private key", authorization="Bearer private", cookies="private cookie")
        finally:
            LOGGER.removeHandler(handler)
        output = stream.getvalue()
        for secret in ["private cv", "private prompt", "private response", "private key", "Bearer private", "private cookie"]:
            self.assertNotIn(secret, output)

    def test_http_fixture_matrix_uses_api_owned_state(self):
        text = "Synthetic CV fixture text long enough for the current one hundred and twenty character minimum. It contains no person or private information."
        expected = {"quota": "provider_service_error", "rate_limit": "analysis_rate_limited", "unavailable": "provider_unavailable", "timeout": "provider_timeout", "malformed": "provider_schema_invalid", "safety": "provider_rejected"}
        for outcome, code in expected.items():
            client = TestClient(create_app())
            connection = client.post("/api/v1/providers", json={"provider_id": "openai", "model_id": "gpt-5-mini", "credential": f"fake-{outcome}"}).json()
            document = client.post("/api/v1/cv/documents", json={"filename": "fixture.txt", "mime_type": "text/plain", "pasted_text": text, "target_role": "AI Engineer", "consent": True}).json()
            job = client.post(f"/api/v1/cv/documents/{document['id']}/analyses", json={"connection_id": connection["id"], "cv_text": text, "target_role": "AI Engineer", "job_description": ""}).json()
            self.assertEqual((job["status"], job["error_code"]), ("failed", code))
            detail = client.get(f"/api/v1/cv/documents/{document['id']}").json()
            self.assertEqual(detail["analyses"][0]["id"], job["id"])


if __name__ == "__main__":
    unittest.main()

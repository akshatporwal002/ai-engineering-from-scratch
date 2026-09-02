import io
import unittest
import zipfile
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.auth import SupabaseAuthenticator
from app.core.config import Settings
from app.core.errors import ApiError
from app.core.rate_limit import RateLimiter
from app.main import create_app
from app.providers.http import MODELS, validate_model
from app.domain.models import ProviderId
from app.services.extraction import extract_text


class ProductionBoundaryTests(unittest.IsolatedAsyncioTestCase):
    def settings(self, **values):
        return Settings(environment="test", adapter="supabase", supabase_url="https://example.supabase.co", supabase_publishable_key="publishable", supabase_service_role_key="service-role", **values)

    def test_production_configuration_fails_closed(self):
        with self.assertRaises(ValidationError):
            Settings(environment="production", adapter="memory")
        with self.assertRaises(ValidationError):
            Settings(environment="production", adapter="supabase")

    async def test_supabase_jwt_requires_signature_issuer_audience_expiry_and_subject(self):
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public = private.public_key().public_numbers()
        kid = "test-key"
        def integer(value):
            return jwt.utils.base64url_encode(value.to_bytes((value.bit_length() + 7) // 8, "big")).decode()
        authenticator = SupabaseAuthenticator(self.settings())
        authenticator._jwks = {"keys": [{"kty": "RSA", "kid": kid, "use": "sig", "alg": "RS256", "n": integer(public.n), "e": integer(public.e)}]}
        authenticator._jwks_at = float("inf")
        user_id, now = uuid4(), datetime.now(UTC)
        claims = {"sub": str(user_id), "iss": "https://example.supabase.co/auth/v1", "aud": "authenticated", "iat": now, "exp": now + timedelta(minutes=5)}
        token = jwt.encode(claims, private, algorithm="RS256", headers={"kid": kid})
        self.assertEqual((await authenticator.verify(token)).user_id, user_id)
        with self.assertRaises(ApiError):
            await authenticator.verify(jwt.encode({**claims, "aud": "other"}, private, algorithm="RS256", headers={"kid": kid}))

    def test_production_routes_reject_invalid_bearer_before_storage(self):
        client = TestClient(create_app(self.settings()))
        response = client.get("/api/v1/providers", headers={"authorization": "Bearer invalid"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "authentication_required")

    def test_rate_limiter_fails_closed(self):
        limiter = RateLimiter(2, 60)
        limiter.check("actor"); limiter.check("actor")
        with self.assertRaises(ApiError):
            limiter.check("actor")

    def test_rate_limit_uses_safe_http_envelope(self):
        client = TestClient(create_app(self.settings(requests_per_minute=5)))
        for _ in range(5):
            self.assertEqual(client.get("/api/v1/health").status_code, 200)
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "rate_limited")
        self.assertEqual(response.headers["retry-after"], "60")

    def test_docx_extraction_is_bounded_and_does_not_execute_content(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as archive:
            archive.writestr("word/document.xml", '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>' + ("Measured delivery impact. " * 8) + "</w:t></w:r></w:p></w:body></w:document>")
        text = extract_text("candidate.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", stream.getvalue())
        self.assertIn("Measured delivery impact", text)

    def test_provider_destinations_are_closed_by_model_allowlists(self):
        self.assertIn("gemini-3.7-flash", MODELS[ProviderId.GEMINI])
        with self.assertRaises(ApiError):
            validate_model(ProviderId.OPENAI, "https://attacker.example/model")


if __name__ == "__main__":
    unittest.main()

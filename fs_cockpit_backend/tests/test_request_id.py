from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_request_id_header_roundtrip():
    # Send a request with X-Request-ID header and verify roundtrip
    headers = {"X-Request-ID": "req-test-123"}
    resp = client.get("/api/v1/servicenow/debug/request_id", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("request_id") == "req-test-123"
    # Response should include header too
    assert resp.headers.get("X-Request-ID") == "req-test-123"


def test_request_id_generated_when_missing():
    # No X-Request-ID header provided; middleware generates one
    resp = client.get("/api/v1/servicenow/debug/request_id")
    assert resp.status_code == 200
    data = resp.json()
    rid = data.get("request_id")
    assert rid is not None
    assert isinstance(rid, str)
    assert rid != ""
    # Response header should match
    assert resp.headers.get("X-Request-ID") == rid

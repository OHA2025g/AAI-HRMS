"""Tests for Apify LinkedIn connector helpers and pipeline stages."""

from unittest.mock import AsyncMock, patch

import pytest

from talent_acquisition.apify_linkedin_connector import (
    ApifyClient,
    build_search_input,
    extract_profile_urls_from_search_items,
    normalize_enriched_profile,
    process_pending_apify_pipelines,
    validate_apify_config,
)


def test_validate_apify_config_requires_token(monkeypatch):
    monkeypatch.delenv("APIFY_API_TOKEN", raising=False)
    ok, msg = validate_apify_config({"enabled": True, "api_mode": "apify"})
    assert not ok
    assert "APIFY_API_TOKEN" in msg


def test_validate_apify_config_ok(monkeypatch):
    monkeypatch.setenv("APIFY_API_TOKEN", "test-token")
    ok, msg = validate_apify_config({"enabled": True, "api_mode": "apify"})
    assert ok
    assert msg == "Apify LinkedIn configured"


def test_build_search_input_from_job():
    job = {
        "id": "job-1",
        "title": "Senior Engineer",
        "location": "Bangalore, India",
        "skills": [{"skill_name": "Python"}, {"skill_name": "Spark"}],
    }
    cfg = {"apify_max_results_per_search": 25, "apify_default_geocode": "in:0:0:0:0:0:0"}
    payload = build_search_input(job, cfg, actor_id="harvestapi/linkedin-profile-search")
    assert payload["searchQuery"] == "Senior Engineer"
    assert payload["maxItems"] == 25
    assert payload["locations"] == ["Bangalore"]


def test_build_powerai_search_input_from_job():
    job = {
        "id": "job-1",
        "title": "Senior Engineer",
        "location": "Bangalore, India",
    }
    cfg = {"apify_max_results_per_search": 25, "apify_default_geocode": "in:0:0:0:0:0:0"}
    payload = build_search_input(job, cfg, actor_id="powerai/linkedin-peoples-search-scraper")
    assert payload["title"] == "Senior Engineer"
    assert payload["maxResults"] == 25
    assert payload["geocode_location"] == "in:0:0:0:0:0:0"


def test_extract_profile_urls_dedupes():
    items = [
        {"url": "https://www.linkedin.com/in/jane-doe?trk=1"},
        {"url": "https://www.linkedin.com/in/jane-doe"},
        {"url": "https://www.linkedin.com/in/john-smith"},
    ]
    urls = extract_profile_urls_from_search_items(items)
    assert len(urls) == 2
    assert urls[0].endswith("/jane-doe")


def test_normalize_enriched_profile_maps_fields():
    item = {
        "fullName": "Jane Doe",
        "headline": "Data Engineer",
        "linkedinUrl": "https://www.linkedin.com/in/jane-doe",
        "location": "Bengaluru",
        "email": "jane@example.com",
        "skills": ["Python", "SQL"],
        "experiences": [{"title": "Engineer", "companyName": "Acme", "jobDescription": "Built pipelines"}],
    }
    out = normalize_enriched_profile(item, job={"id": "job-1"}, pipeline_id="pipe-1")
    assert out["full_name"] == "Jane Doe"
    assert out["email"] == "jane@example.com"
    assert out["linkedin_url"].endswith("/jane-doe")
    assert out["source"] == "LINKEDIN"
    assert out["import_metadata"]["provider"] == "apify"
    assert "Python" in [s["skill_name"] for s in out["skills"]]
    assert "Built pipelines" in out["resume_text"]


@pytest.mark.asyncio
async def test_apify_client_start_actor_run(monkeypatch):
    monkeypatch.setenv("APIFY_API_TOKEN", "test-token")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"id": "run-1", "defaultDatasetId": "ds-1"}}

    async def fake_post(self, url, headers=None, json=None):
        assert "harvestapi~linkedin-profile-search" in url
        return FakeResponse()

    with patch("httpx.AsyncClient.post", fake_post):
        client = ApifyClient()
        run = await client.start_actor_run(
            "harvestapi/linkedin-profile-search",
            {"searchQuery": "engineer", "maxItems": 5},
        )
    assert run["id"] == "run-1"


@pytest.mark.asyncio
async def test_process_pending_advances_search_stage(monkeypatch):
    monkeypatch.setenv("APIFY_API_TOKEN", "test-token")

    pipeline = {
        "id": "pipe-1",
        "job_id": "job-1",
        "status": "search_running",
        "search_run_id": "run-search",
        "search_dataset_id": "ds-search",
        "enrich_actor_id": "dev_fusion/linkedin-profile-scraper",
    }

    class FakeDb:
        def __init__(self):
            self.doc = dict(pipeline)
            self.jobs = self

        def __getitem__(self, name):
            return self

        async def find_one(self, query, projection=None, sort=None):
            if query.get("id") == "pipe-1":
                return dict(self.doc)
            if query.get("job_id") == "job-1":
                return {"id": "job-1", "title": "Engineer"}
            return None

        def find(self, query, projection=None):
            class Cursor:
                def sort(self, *args, **kwargs):
                    return self

                def limit(self, n):
                    return self

                async def to_list(self, n):
                    return [pipeline]

            return Cursor()

        async def update_one(self, query, update):
            if "$set" in update:
                self.doc.update(update["$set"])

    fake_db = FakeDb()

    async def fake_get_run(self, run_id):
        return {"status": "SUCCEEDED", "defaultDatasetId": "ds-search"}

    async def fake_list_items(self, dataset_id, limit=1000):
        return [{"url": "https://www.linkedin.com/in/jane-doe"}]

    async def fake_start(self, actor_id, run_input):
        return {"id": "run-enrich", "defaultDatasetId": "ds-enrich"}

    with patch.object(ApifyClient, "get_run", fake_get_run), patch.object(
        ApifyClient, "list_dataset_items", fake_list_items
    ), patch.object(ApifyClient, "start_actor_run", fake_start):
        cfg = {"enabled": True, "api_mode": "apify", "apify_enrich_batch_size": 10}
        result = await process_pending_apify_pipelines(
            fake_db,
            cfg,
            AsyncMock(),
            limit=1,
            pipeline_id="pipe-1",
        )

    assert result["processed"] == 1
    assert fake_db.doc.get("enrich_run_id") == "run-enrich"

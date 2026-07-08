#!/usr/bin/env python3
"""Load and stress tests for AAI-HRMS Smart Hiring (Docker @ localhost:3001)."""

from __future__ import annotations

import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

import httpx

BASE = "http://localhost:3001"
API = f"{BASE}/api"
EMAIL = "aghoreshwar@hotmail.com"
PASSWORD = "Prince@1804"


@dataclass
class RunResult:
    name: str
    concurrency: int
    total: int
    ok: int
    errors: int
    duration_s: float
    latencies_ms: list[float] = field(default_factory=list)
    status_codes: dict[int, int] = field(default_factory=dict)
    sample_error: Optional[str] = None

    @property
    def rps(self) -> float:
        return self.total / self.duration_s if self.duration_s else 0

    def percentile(self, p: float) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_lat = sorted(self.latencies_ms)
        idx = min(int(len(sorted_lat) * p / 100), len(sorted_lat) - 1)
        return sorted_lat[idx]


async def fetch_token(client: httpx.AsyncClient) -> str:
    r = await client.post(
        f"{API}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def run_batch(
    name: str,
    url: str,
    *,
    concurrency: int,
    total: int,
    method: str = "GET",
    headers: Optional[dict] = None,
    json_body: Optional[dict] = None,
) -> RunResult:
    sem = asyncio.Semaphore(concurrency)
    latencies: list[float] = []
    status_codes: dict[int, int] = {}
    errors = 0
    sample_error: Optional[str] = None
    start = time.perf_counter()

    async def one(client: httpx.AsyncClient) -> None:
        nonlocal errors, sample_error
        async with sem:
            t0 = time.perf_counter()
            try:
                if method == "GET":
                    r = await client.get(url, headers=headers, timeout=60.0)
                else:
                    r = await client.post(url, headers=headers, json=json_body, timeout=60.0)
                ms = (time.perf_counter() - t0) * 1000
                latencies.append(ms)
                status_codes[r.status_code] = status_codes.get(r.status_code, 0) + 1
                if r.status_code >= 400:
                    errors += 1
                    if not sample_error:
                        sample_error = f"HTTP {r.status_code}: {r.text[:120]}"
            except Exception as exc:  # noqa: BLE001
                errors += 1
                latencies.append((time.perf_counter() - t0) * 1000)
                if not sample_error:
                    sample_error = str(exc)[:120]

    limits = httpx.Limits(max_connections=concurrency + 10, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(limits=limits) as client:
        await asyncio.gather(*[one(client) for _ in range(total)])

    duration = time.perf_counter() - start
    ok = total - errors
    return RunResult(
        name=name,
        concurrency=concurrency,
        total=total,
        ok=ok,
        errors=errors,
        duration_s=duration,
        latencies_ms=latencies,
        status_codes=status_codes,
        sample_error=sample_error,
    )


def print_result(r: RunResult) -> None:
    err_pct = (r.errors / r.total * 100) if r.total else 0
    print(f"\n{'=' * 72}")
    print(f"  {r.name}")
    print(f"{'=' * 72}")
    print(f"  Concurrency: {r.concurrency}  |  Requests: {r.total}  |  Duration: {r.duration_s:.2f}s")
    print(f"  Throughput:  {r.rps:.1f} req/s  |  OK: {r.ok}  |  Errors: {r.errors} ({err_pct:.1f}%)")
    print(f"  Status codes: {dict(sorted(r.status_codes.items()))}")
    if r.latencies_ms:
        print(
            f"  Latency ms — min: {min(r.latencies_ms):.0f}  "
            f"p50: {r.percentile(50):.0f}  p95: {r.percentile(95):.0f}  "
            f"p99: {r.percentile(99):.0f}  max: {max(r.latencies_ms):.0f}"
        )
    if r.sample_error:
        print(f"  Sample error: {r.sample_error}")


async def load_tests(token: str) -> list[RunResult]:
    auth = {"Authorization": f"Bearer {token}"}
    scenarios = [
        ("LOAD — API Health", f"{API}/health", 30, 1500, "GET", None, None),
        ("LOAD — Dashboard SPA", f"{BASE}/dashboard", 20, 400, "GET", None, None),
        ("LOAD — Jobs API (auth)", f"{API}/jobs", 15, 300, "GET", auth, None),
        ("LOAD — Hiring Pack (auth)", f"{API}/dashboard/hiring-pack", 10, 150, "GET", auth, None),
        ("LOAD — Candidates API (auth)", f"{API}/candidates", 15, 300, "GET", auth, None),
    ]
    results = []
    for name, url, conc, total, method, headers, body in scenarios:
        results.append(await run_batch(name, url, concurrency=conc, total=total, method=method, headers=headers, json_body=body))
        print_result(results[-1])
    return results


async def stress_ramp(name: str, url: str, headers: Optional[dict], levels: list[int]) -> list[RunResult]:
    results = []
    print(f"\n{'#' * 72}")
    print(f"  STRESS RAMP — {name}")
    print(f"  URL: {url}")
    print(f"{'#' * 72}")
    for conc in levels:
        r = await run_batch(f"STRESS @ {conc} concurrent", url, concurrency=conc, total=conc * 20, headers=headers)
        results.append(r)
        print_result(r)
        err_pct = (r.errors / r.total * 100) if r.total else 0
        if err_pct > 5 or r.percentile(95) > 5000:
            print(f"\n  ⚠ Breakpoint signal at concurrency={conc} (errors {err_pct:.1f}%, p95 {r.percentile(95):.0f}ms)")
    return results


async def main() -> int:
    print("AAI-HRMS Load & Stress Test")
    print(f"Target: {BASE}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    async with httpx.AsyncClient() as client:
        try:
            token = await fetch_token(client)
        except Exception as exc:  # noqa: BLE001
            print(f"FATAL: login failed — {exc}")
            return 1

    print("Login OK — token acquired")

    load_results = await load_tests(token)

    stress_levels = [10, 25, 50, 75, 100, 150]
    auth = {"Authorization": f"Bearer {token}"}
    await stress_ramp("API Health", f"{API}/health", None, stress_levels)
    await stress_ramp("Jobs API", f"{API}/jobs", auth, [5, 10, 20, 30, 50, 75])
    await stress_ramp("Hiring Pack API", f"{API}/dashboard/hiring-pack", auth, [5, 10, 15, 25, 40])

    # Summary
    print(f"\n{'=' * 72}")
    print("  SUMMARY")
    print(f"{'=' * 72}")
    failed_load = [r for r in load_results if r.errors / r.total > 0.01]
    if failed_load:
        print(f"  Load scenarios with >1% errors: {len(failed_load)}")
        for r in failed_load:
            print(f"    - {r.name}: {r.errors}/{r.total} errors")
    else:
        print("  All load scenarios: error rate ≤ 1% ✓")

    slow = [r for r in load_results if r.percentile(95) > 2000]
    if slow:
        print(f"  Load scenarios with p95 > 2s: {len(slow)}")
        for r in slow:
            print(f"    - {r.name}: p95={r.percentile(95):.0f}ms")
    else:
        print("  All load scenarios: p95 ≤ 2s ✓")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

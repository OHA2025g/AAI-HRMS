#!/usr/bin/env python3
"""
M10-3 lightweight load smoke: concurrent GET /api/health (no extra deps).

Usage:
  export PERF_BASE_URL=http://127.0.0.1:11001
  python scripts/perf_smoke_m10.py

Optional: PERF_CONCURRENCY=32 PERF_REQUESTS=200
"""
from __future__ import annotations

import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def main() -> int:
    base = (os.environ.get("PERF_BASE_URL") or "http://127.0.0.1:11001").rstrip("/")
    url = f"{base}/api/health"
    n = max(1, int(os.environ.get("PERF_REQUESTS") or "100"))
    workers = max(1, int(os.environ.get("PERF_CONCURRENCY") or "16"))

    def one(i: int) -> tuple[int, float]:
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                code = r.getcode()
        except Exception as e:
            return (-1, time.perf_counter() - t0)
        return (code, time.perf_counter() - t0)

    t_start = time.perf_counter()
    lat: list[float] = []
    errors = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(one, i) for i in range(n)]
        for f in as_completed(futs):
            code, dt = f.result()
            lat.append(dt)
            if code != 200:
                errors += 1
    total = time.perf_counter() - t_start
    lat.sort()
    p50 = lat[len(lat) // 2]
    p95 = lat[int(len(lat) * 0.95)] if lat else 0.0
    print(f"url={url} requests={n} workers={workers} errors={errors} wall_sec={total:.3f}")
    print(f"latency_s p50={p50:.4f} p95={p95:.4f} rps={n/total:.1f}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

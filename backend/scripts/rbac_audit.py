#!/usr/bin/env python3
"""
Static RBAC audit for backend/server.py (M0).

Scans @api_router.* route handlers and classifies:
  - authenticated: Depends(get_current_user) on the handler
  - admin: calls _require_admin
  - phase1: calls _require_phase1_access (permission extracted when possible)

Does not import server.py (avoids Mongo side effects).

Usage:
  python scripts/rbac_audit.py
  python scripts/rbac_audit.py --strict   # exit 1 if unauthenticated route not in allowlist
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server.py"
ALLOWLIST = Path(__file__).with_name("rbac_audit_allowlist.json")

ROUTE_DECORATOR = re.compile(
    r"^@api_router\.(get|post|put|delete|patch)\(\s*\"([^\"]+)\"",
    re.MULTILINE,
)


def _load_allowlist() -> Set[Tuple[str, str]]:
    if not ALLOWLIST.is_file():
        return set()
    data = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    out: Set[Tuple[str, str]] = set()
    for row in data.get("public_routes", []):
        out.add((row["method"].upper(), row["path"]))
    return out


def _segment_routes(source: str) -> List[Tuple[re.Match, str]]:
    matches = list(ROUTE_DECORATOR.finditer(source))
    segments: List[Tuple[re.Match, str]] = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(source)
        segments.append((m, source[m.start() : end]))
    return segments


def _classify_segment(segment: str) -> Dict[str, Any]:
    auth = "Depends(get_current_user)" in segment
    admin = "_require_admin(" in segment
    phase1 = "_require_phase1_access(" in segment
    perms = re.findall(
        r"_require_phase1_access\(\s*current_user\s*,\s*\"([^\"]+)\"\s*\)",
        segment,
    )
    return {
        "authenticated": auth,
        "admin": admin,
        "phase1": phase1,
        "phase1_permissions": list(dict.fromkeys(perms)),
    }


def _rbac_label(info: Dict[str, Any]) -> str:
    if info["admin"]:
        return "admin"
    if info["phase1_permissions"]:
        return "phase1:" + ",".join(info["phase1_permissions"])
    if info["phase1"]:
        return "phase1:unknown_perm"
    if info["authenticated"]:
        return "authenticated"
    return "unauthenticated"


def main() -> int:
    parser = argparse.ArgumentParser(description="RBAC static audit for FastAPI api_router routes")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if an unauthenticated route is not listed in rbac_audit_allowlist.json",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON instead of a text table",
    )
    args = parser.parse_args()

    if not SERVER.is_file():
        print(f"server.py not found at {SERVER}", file=sys.stderr)
        return 2

    source = SERVER.read_text(encoding="utf-8")
    allow = _load_allowlist()
    rows: List[Dict[str, Any]] = []
    violations: List[str] = []

    for m, seg in _segment_routes(source):
        method = m.group(1).upper()
        path = m.group(2)
        info = _classify_segment(seg)
        label = _rbac_label(info)
        row = {
            "method": method,
            "path": path,
            "rbac": label,
            "authenticated": info["authenticated"],
        }
        rows.append(row)
        if label == "unauthenticated" and (method, path) not in allow:
            violations.append(f"{method} /api{path} — unauthenticated, not in allowlist")

    if args.json:
        print(json.dumps({"routes": rows, "violations": violations}, indent=2))
    else:
        print(f"{'METHOD':<7} {'PATH':<48} {'RBAC':<40}")
        print("-" * 100)
        for r in rows:
            print(f"{r['method']:<7} {r['path']:<48} {r['rbac']:<40}")
        if violations:
            print("\n--- STRICT VIOLATIONS ---", file=sys.stderr)
            for v in violations:
                print(v, file=sys.stderr)

    if args.strict and violations:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

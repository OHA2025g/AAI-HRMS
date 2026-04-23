#!/usr/bin/env python3
"""Create a distributable zip of the repo (sources, docker, db_dump), excluding heavy/generated paths."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import zipfile


SKIP_DIR_NAMES = frozenset(
    {
        "node_modules",
        ".git",
        ".cursor",
        "__pycache__",
        ".venv",
        "venv",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "build",
        "coverage",
        ".yarn",
    }
)

SKIP_FILES = frozenset({".env"})


def should_skip_dir(path: Path, root: Path) -> bool:
    if path.name in SKIP_DIR_NAMES:
        return True
    rel = path.relative_to(root)
    parts = rel.parts
    if "frontend" in parts:
        idx = parts.index("frontend")
        if idx + 1 < len(parts) and parts[idx + 1] == "build":
            return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .zip path (default: parent of repo / aai-hrms-complete-FULL.zip)",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    out = args.output
    if out is None:
        out = root.parent / "aai-hrms-complete-FULL.zip"

    arc_prefix = "aai-hrms-complete"

    readme = """AAI HRMS — full project bundle
==============================

Includes backend, frontend sources, docker-compose.yml, db_dump Mongo archive, docs, e2e, deploy.

Excluded: node_modules, .git, Python venvs, build outputs, .env (use .env.example).

Database: see db_dump/aai_hrms.archive.gz — optional mongorestore, or use docker compose (seeds on API start).

Run: docker compose up --build  →  http://localhost:3001
"""

    tmp = out.with_suffix(out.suffix + ".part")
    n = 0
    try:
        with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"{arc_prefix}/BUNDLE-README.txt", readme)
            n += 1
            for dirpath, dirnames, filenames in os.walk(root, topdown=True):
                dpath = Path(dirpath)
                dirnames[:] = [d for d in dirnames if not should_skip_dir(dpath / d, root)]
                for name in filenames:
                    if name in SKIP_FILES:
                        continue
                    fp = dpath / name
                    if not fp.is_file():
                        continue
                    rel = fp.relative_to(root)
                    arcname = f"{arc_prefix}/{rel.as_posix()}"
                    zf.write(fp, arcname)
                    n += 1
        os.replace(tmp, out)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)

    print(f"Wrote {n} entries to {out} ({out.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()

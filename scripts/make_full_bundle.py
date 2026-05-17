#!/usr/bin/env python3
"""
Create a distributable zip of the repo (sources, docker, db_dump).

Excludes heavy/generated paths (.git, node_modules, venvs, build, .env).
Writes to a temp file first, validates the archive, then moves atomically to the destination.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

# Directory names skipped anywhere in the tree (os.walk prunes before descent).
SKIP_DIR_NAMES = frozenset(
    {
        "node_modules",
        ".git",
        ".cursor",
        "__pycache__",
        ".venv",
        ".venv_fresh",
        "venv",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "build",
        "coverage",
        ".yarn",
        ".cache",
    }
)

SKIP_FILE_NAMES = frozenset({".env", ".DS_Store"})
SKIP_FILE_SUFFIXES = (".pyc", ".pyo", ".part", ".zip.part")


def should_skip_dir(dir_path: Path) -> bool:
    return dir_path.name in SKIP_DIR_NAMES


def should_skip_file(file_path: Path) -> bool:
    if file_path.name in SKIP_FILE_NAMES:
        return True
    if file_path.name.endswith(SKIP_FILE_SUFFIXES):
        return True
    if file_path.is_symlink():
        return True
    try:
        if not file_path.is_file():
            return True
    except OSError:
        return True
    return False


def iter_bundle_files(root: Path):
    """Yield (absolute_path, archive_name) for files to include."""
    prefix = "aai-hrms-complete"
    for dirpath, dirnames, filenames in os.walk(root, topdown=True, followlinks=False):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(Path(dirpath) / d)]
        for name in filenames:
            fp = Path(dirpath) / name
            if should_skip_file(fp):
                continue
            rel = fp.relative_to(root).as_posix()
            yield fp, f"{prefix}/{rel}"


def build_zip(
    root: Path,
    out: Path,
    *,
    store_only: bool = False,
) -> tuple[int, int]:
    """Build zip at `out`. Returns (file_count, size_bytes)."""
    compression = zipfile.ZIP_STORED if store_only else zipfile.ZIP_DEFLATED
    compresslevel = None if store_only else 3

    readme = """AAI HRMS — full project bundle
==============================

Includes backend, frontend sources, docker-compose.yml, db_dump, docs, e2e, deploy.

Excluded: .git, node_modules, Python venvs (.venv, venv, .venv_fresh), build/, .env

Run: docker compose up --build  →  http://localhost:3001
Login (demo): qa_admin@aai-hrms.local / QA_Seed_ChangeMe!
"""

    count = 0
    kwargs: dict = {"compression": compression}
    if compresslevel is not None:
        kwargs["compresslevel"] = compresslevel

    with zipfile.ZipFile(out, "w", **kwargs) as zf:
        zf.writestr("aai-hrms-complete/BUNDLE-README.txt", readme)
        count += 1
        for fp, arcname in iter_bundle_files(root):
            zf.write(fp, arcname)
            count += 1

    with zipfile.ZipFile(out, "r") as zf:
        err = zf.testzip()
    if err:
        raise RuntimeError(f"Zip validation failed at entry: {err}")

    return count, out.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .zip path (default: <repo-parent>/aai-hrms-complete.zip)",
    )
    parser.add_argument(
        "--store",
        action="store_true",
        help="No compression (faster, larger file)",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    out = args.output
    if out is None:
        out = root.parent / "aai-hrms-complete.zip"
    out = out.expanduser().resolve()

    # Remove stale partial/corrupt outputs from prior interrupted runs.
    for stale in (out, out.with_suffix(out.suffix + ".part"), Path(str(out) + ".part")):
        if stale.exists() and stale != out:
            stale.unlink(missing_ok=True)

    out.parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_name = tempfile.mkstemp(suffix=".zip", prefix="aai-hrms-bundle-")
    os.close(fd)
    tmp_path = Path(tmp_name)

    try:
        print(f"Bundling {root} …", flush=True)
        n, size = build_zip(root, tmp_path, store_only=args.store)
        shutil.move(str(tmp_path), str(out))
        print(f"Wrote {n} entries → {out}", flush=True)
        print(f"Size: {size / 1024:.1f} KiB ({size / (1024 * 1024):.2f} MiB)", flush=True)
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())

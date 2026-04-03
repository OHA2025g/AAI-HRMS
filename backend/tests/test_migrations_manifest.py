"""Lightweight checks for migration file layout (no Mongo required)."""

from mongo_migrations_runner import MIGRATIONS_DIR, _list_migration_files


def test_migrations_directory_exists():
    assert MIGRATIONS_DIR.is_dir()


def test_core_migration_files_discovered():
    stems = {p.stem for p in _list_migration_files()}
    assert "0001_schema_migrations_registry" in stems
    assert "0002_example_noop" in stems
    assert "0008_m9_analytics_indexes" in stems
    assert "0009_m10_event_backbone" in stems
    assert "0010_m7_seed_lifecycle_automation_rules" in stems

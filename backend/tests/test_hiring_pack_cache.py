"""Tests for hiring-pack in-process cache invalidation."""

from talent_acquisition.hiring_pack_cache import (
    get_cached_hiring_pack,
    hiring_pack_cache_size,
    invalidate_hiring_pack_cache,
    set_cached_hiring_pack,
)


def test_hiring_pack_cache_roundtrip():
    invalidate_hiring_pack_cache(reason="test_reset")
    assert get_cached_hiring_pack("k1") is None
    set_cached_hiring_pack("k1", {"ok": True})
    assert get_cached_hiring_pack("k1") == {"ok": True}
    assert hiring_pack_cache_size() == 1


def test_hiring_pack_cache_invalidate_clears_all():
    set_cached_hiring_pack("k1", {"a": 1})
    set_cached_hiring_pack("k2", {"b": 2})
    cleared = invalidate_hiring_pack_cache(reason="stage_change")
    assert cleared == 2
    assert hiring_pack_cache_size() == 0

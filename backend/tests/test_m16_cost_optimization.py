"""M16 Cost Optimization & Automation — import/smoke checks."""

from m16_cost_optimization_automation.constants import LIST_SEGMENT_COLLECTION
from m16_cost_optimization_automation.routes import create_cost_optimization_automation_router


def test_list_segment_map_nonempty():
    assert "workforce-cost" in LIST_SEGMENT_COLLECTION
    assert "dashboard" not in LIST_SEGMENT_COLLECTION


def test_router_factory():
    r = create_cost_optimization_automation_router(
        db=None,
        get_current_user=lambda: None,
        require_read=lambda u: u,
        require_write=lambda u: u,
    )
    assert len(r.routes) >= 10

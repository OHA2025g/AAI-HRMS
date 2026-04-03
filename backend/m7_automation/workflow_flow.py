"""M7: execute multi-step workflows from a React Flow–style graph (nodes + edges)."""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Any, Callable, Awaitable, Dict, List, Optional, Set, Tuple

# Node `data` may include:
# - action_type, action_config for executable steps
# - label for UI only


def _is_action_node(n: Dict[str, Any]) -> bool:
    data = n.get("data") if isinstance(n.get("data"), dict) else {}
    return bool(data.get("action_type"))


def _node_id(n: Dict[str, Any]) -> str:
    return str(n.get("id") or "")


def topological_action_order(flow_graph: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Returns action nodes in an order that respects edges (DAG).
    If the graph has cycles or is empty, falls back to document order of action nodes.
    """
    nodes = flow_graph.get("nodes") or []
    edges = flow_graph.get("edges") or []
    if not isinstance(nodes, list):
        return []

    action_nodes = [n for n in nodes if isinstance(n, dict) and _is_action_node(n)]
    if not action_nodes:
        return []

    id_to_node = {_node_id(n): n for n in nodes if _node_id(n)}
    adj: Dict[str, List[str]] = defaultdict(list)
    indeg: Dict[str, int] = defaultdict(int)

    for e in edges:
        if not isinstance(e, dict):
            continue
        s, t = str(e.get("source") or ""), str(e.get("target") or "")
        if s and t and s in id_to_node and t in id_to_node:
            adj[s].append(t)
            indeg[t] += 1
            indeg.setdefault(s, indeg.get(s, 0))

    for nid in id_to_node:
        indeg.setdefault(nid, 0)

    # Start from nodes with indegree 0 (typically trigger), traverse to actions
    q: deque[str] = deque([nid for nid in id_to_node if indeg.get(nid, 0) == 0])
    ordered_ids: List[str] = []
    seen: Set[str] = set()

    while q:
        u = q.popleft()
        if u in seen:
            continue
        seen.add(u)
        ordered_ids.append(u)
        for v in adj.get(u, []):
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)

    action_ids = {_node_id(n) for n in action_nodes}
    ordered_actions = [id_to_node[i] for i in ordered_ids if i in action_ids]

    if len(ordered_actions) != len(action_nodes):
        # cycle or disconnected — preserve stable order by y then x
        def sort_key(n: Dict[str, Any]) -> Tuple[float, float]:
            pos = n.get("position") or {}
            return (float(pos.get("y") or 0), float(pos.get("x") or 0))

        return sorted(action_nodes, key=sort_key)

    return ordered_actions


async def execute_flow_graph(
    flow_graph: Dict[str, Any],
    *,
    rule: Dict[str, Any],
    background_tasks: Any,
    run_single_action: Callable[..., Awaitable[Dict[str, Any]]],
) -> Dict[str, Any]:
    steps_out: List[Dict[str, Any]] = []
    for i, node in enumerate(topological_action_order(flow_graph)):
        data = node.get("data") or {}
        at = str(data.get("action_type") or "NOOP").upper()
        cfg = data.get("action_config") if isinstance(data.get("action_config"), dict) else {}
        pseudo_rule = {**rule, "action_type": at, "action_config": cfg}
        detail = await run_single_action(pseudo_rule, background_tasks, step_index=i)
        steps_out.append({"node_id": _node_id(node), "action_type": at, "detail": detail})
    return {"flow_steps": len(steps_out), "steps": steps_out}

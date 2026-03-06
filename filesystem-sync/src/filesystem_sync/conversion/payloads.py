"""Helpers for translating between filesystem-sync and DMS payload shapes."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def _coerce_steps(raw_steps: Any) -> list[dict[str, Any]]:
    """Return only step entries that match the expected JSON object shape."""
    if not isinstance(raw_steps, list):
        return []
    return [step for step in raw_steps if isinstance(step, dict)]


def extract_experiment_fields(
    json_data: dict[str, Any] | list[dict[str, Any]] | None,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """
    Normalize experiment JSON returned by legacy converters or DMS.

    Supported shapes:
    - legacy list of steps
    - legacy dict with top-level steps/graphical_model
    - DMS dict with top-level experiment/workflows
    """
    if isinstance(json_data, list):
        return _coerce_steps(json_data), None

    if not isinstance(json_data, dict):
        return [], None

    if "experiment" in json_data and isinstance(json_data["experiment"], dict):
        experiment = json_data["experiment"]
        graphical_model = experiment.get("graphical_model")
        return _coerce_steps(experiment.get("steps")), graphical_model if isinstance(graphical_model, dict) else None

    graphical_model = json_data.get("graphical_model")
    return _coerce_steps(json_data.get("steps")), graphical_model if isinstance(graphical_model, dict) else None


def extract_workflow_references(steps: list[dict[str, Any]]) -> set[str]:
    """Collect workflow identifiers referenced by experiment steps."""
    references: set[str] = set()

    for step in steps:
        if not isinstance(step, dict):
            continue
        spaces = step.get("spaces", [])
        if not isinstance(spaces, list):
            continue
        for space in spaces:
            if not isinstance(space, dict):
                continue
            workflow_id = space.get("workflow_id")
            if isinstance(workflow_id, str) and workflow_id.strip():
                references.add(workflow_id)

    return references


def build_experiment_dms_payload(
    name: str,
    steps: list[dict[str, Any]],
    workflows: Iterable[Any],
) -> dict[str, Any]:
    """Build the experiment payload expected by the DMS API."""
    workflow_references = extract_workflow_references(steps)
    selected_workflows: list[dict[str, Any]] = []
    unresolved_references = set(workflow_references)
    seen_workflow_keys: set[str] = set()

    for workflow in workflows:
        workflow_name = getattr(workflow, "name", None)
        if not isinstance(workflow_name, str) or not workflow_name:
            continue

        workflow_id = getattr(workflow, "id", None)
        workflow_identifiers = {workflow_name}
        if workflow_id is not None:
            workflow_identifiers.add(str(workflow_id))

        if workflow_references and not (workflow_identifiers & unresolved_references):
            continue

        workflow_key = str(workflow_id) if workflow_id is not None else workflow_name
        if workflow_key in seen_workflow_keys:
            continue

        graphical_model = getattr(workflow, "graphical_model", None)
        selected_workflows.append(
            {
                "id": str(workflow_id) if workflow_id is not None else workflow_name,
                "name": workflow_name,
                "graphical_model": graphical_model if isinstance(graphical_model, dict) else {"nodes": [], "edges": []},
            }
        )
        seen_workflow_keys.add(workflow_key)
        unresolved_references -= workflow_identifiers

    if unresolved_references:
        missing = ", ".join(sorted(unresolved_references))
        raise ValueError(f"Referenced workflows are missing from the database: {missing}")

    return {
        "experiment": {
            "name": name,
            "steps": steps,
        },
        "workflows": selected_workflows,
    }

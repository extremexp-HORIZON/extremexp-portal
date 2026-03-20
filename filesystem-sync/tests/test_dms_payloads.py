"""Tests for DMS payload translation helpers."""

from dataclasses import dataclass
from uuid import uuid4

from filesystem_sync.conversion.payloads import (
    build_experiment_dms_payload,
    extract_experiment_fields,
)


@dataclass
class WorkflowStub:
    id: str
    name: str
    graphical_model: dict


class TestDmsPayloads:
    """Tests for DMS payload helpers."""

    def test_extract_experiment_fields_supports_dms_payload_shape(self):
        payload = {
            "experiment": {
                "name": "demo",
                "steps": [{"id": "step-1"}],
            },
            "workflows": [{"name": "wf-1", "graphical_model": {"nodes": [], "edges": []}}],
        }

        steps, graphical_model = extract_experiment_fields(payload)

        assert steps == [{"id": "step-1"}]
        assert graphical_model is None

    def test_extract_experiment_fields_ignores_unexpected_json_shapes(self):
        steps, graphical_model = extract_experiment_fields("invalid")

        assert steps == []
        assert graphical_model is None

    def test_build_experiment_dms_payload_filters_to_referenced_workflows(self):
        workflow_id = str(uuid4())
        other_id = str(uuid4())
        steps = [
            {
                "id": "step-1",
                "spaces": [{"workflow_id": workflow_id}],
            }
        ]
        workflows = [
            WorkflowStub(workflow_id, "wf-a", {"nodes": [{"id": "1"}], "edges": []}),
            WorkflowStub(other_id, "wf-b", {"nodes": [{"id": "2"}], "edges": []}),
        ]

        payload = build_experiment_dms_payload("demo", steps, workflows)

        assert payload["experiment"]["name"] == "demo"
        assert payload["experiment"]["steps"] == steps
        assert payload["workflows"] == [
            {
                "id": workflow_id,
                "name": "wf-a",
                "graphical_model": {"nodes": [{"id": "1"}], "edges": []},
            }
        ]

    def test_build_experiment_dms_payload_raises_for_missing_workflow_reference(self):
        steps = [
            {
                "id": "step-1",
                "spaces": [{"workflow_id": "missing-workflow"}],
            }
        ]

        try:
            build_experiment_dms_payload("demo", steps, [])
        except ValueError as e:
            assert "missing-workflow" in str(e)
        else:
            raise AssertionError("Expected missing workflow reference to raise ValueError")

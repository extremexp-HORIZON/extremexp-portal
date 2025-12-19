"""
HTTP client for the EMF Cloud Model Server.

The EMF Cloud server (emf-cloud-service) validates and stores workflow models
conforming to the workflow.ecore meta-model.

This client handles:
- Converting graphical models to EMF JSON format
- Posting models to EMF Cloud for validation
- Retrieving XMI representations
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
import structlog
from nanoid import generate

from filesystem_sync.config import get_config

logger = structlog.get_logger(__name__)


@dataclass
class EMFConversionError:
    """Represents an EMF conversion error with details."""

    timestamp: datetime
    service_url: str
    operation: str
    error_message: str

    def to_error_file_content(self) -> str:
        """Format the error for writing to a .xxp.err file."""
        lines = [
            f"EMF conversion failed at {self.timestamp.isoformat()}",
            f"Service: {self.service_url}",
            f"Operation: {self.operation}",
            f"Error: {self.error_message}",
        ]
        return "\n".join(lines)


@dataclass
class EMFConversionResult:
    """Result of an EMF conversion operation."""

    success: bool
    data: dict[str, Any] | None = None  # EMF JSON model and XMI
    error: EMFConversionError | None = None


class EMFClient:
    """
    Async HTTP client for the EMF Cloud Model Server.

    Converts graphical models to EMF format and validates them against
    the workflow.ecore meta-model.
    """

    def __init__(
        self,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ):
        """
        Initialize the EMF client.

        Args:
            base_url: Base URL of the EMF Cloud service (default from config)
            timeout_seconds: HTTP request timeout (default from config)
        """
        config = get_config()
        self._base_url = base_url or config.emf_service_url
        self._timeout = timeout_seconds or config.http_timeout_seconds
        self._client: httpx.AsyncClient | None = None
        self._meta_model_loc: str | None = None

        # Primitive type mapping
        self._primitive_types_map = {
            "integer": "NUMBER",
            "real": "NUMBER",
            "string": "STRING",
            "boolean": "BOOLEAN",
            "blob": "BLOB",
        }

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _create_error(
        self,
        operation: str,
        message: str,
    ) -> EMFConversionError:
        """Create an EMFConversionError with current timestamp."""
        return EMFConversionError(
            timestamp=datetime.now(UTC),
            service_url=self._base_url,
            operation=operation,
            error_message=message,
        )

    async def _init_meta_model_location(self) -> str:
        """Get the location of the meta model in the server."""
        if self._meta_model_loc is not None:
            return self._meta_model_loc

        client = await self._get_client()
        response = await client.get("/models", params={"modeluri": "Generic.workflow"})

        if response.status_code != 200:
            raise RuntimeError(f"Failed to get meta model location: {response.text}")

        location = response.json()["data"]["$type"].split("#//")[0]
        self._meta_model_loc = f"{location}#//"
        return self._meta_model_loc

    def _emf_object_type(self, type_name: str) -> str:
        """Get the EMF object $type for the given type name."""
        if self._meta_model_loc is None:
            raise RuntimeError("Meta model location not initialized")
        return f"{self._meta_model_loc}{type_name}"

    async def convert_experiment_to_emf(
        self,
        name: str,
        graphical_model: dict[str, Any],
    ) -> EMFConversionResult:
        """
        Convert an experiment's graphical model to EMF format.

        This posts the model to EMF Cloud for validation and returns
        both the validated EMF JSON and XMI representations.

        Args:
            name: Name of the experiment
            graphical_model: The graphical model data

        Returns:
            EMFConversionResult with EMF JSON and XMI on success
        """
        try:
            # Initialize meta model location
            await self._init_meta_model_location()

            # Convert the graphical model
            converter = _EMFModelConverter(
                meta_model_loc=self._meta_model_loc,  # pyright: ignore[reportArgumentType]
                primitive_types_map=self._primitive_types_map,
            )

            emf_model = converter.convert(graphical_model)

            # Post to EMF Cloud for validation
            client = await self._get_client()
            work_name = f"{name}-{generate(size=3)}.workflow"

            response = await client.post(
                "/models",
                params={"modeluri": work_name},
                json={"data": emf_model},
            )

            response_json = response.json()

            if response_json.get("type") != "success":
                # Cleanup and return error
                error = self._create_error(
                    operation="convert_to_emf",
                    message=f"EMF validation failed: {response_json}",
                )
                logger.error(
                    "EMF validation failed",
                    name=name,
                    response=response_json,
                )
                return EMFConversionResult(success=False, error=error)

            validated_emf_model = response_json["data"]

            # Get XMI representation
            xmi_response = await client.get(
                "/models",
                params={"modeluri": work_name, "format": "xmi"},
            )
            xmi_model = (
                xmi_response.json().get("data")
                if xmi_response.status_code == 200
                else None
            )

            # Clean up the temporary model
            await client.delete("/models", params={"modeluri": work_name})

            logger.info("Converted experiment to EMF", name=name)
            return EMFConversionResult(
                success=True,
                data={"json": validated_emf_model, "xmi": xmi_model},
            )

        except httpx.TimeoutException as e:
            error = self._create_error(
                operation="convert_to_emf",
                message=f"Request timeout: {e}",
            )
            logger.error("EMF conversion timeout", name=name, error=str(e))
            return EMFConversionResult(success=False, error=error)

        except httpx.RequestError as e:
            error = self._create_error(
                operation="convert_to_emf",
                message=f"Request error: {e}",
            )
            logger.error("EMF conversion request error", name=name, error=str(e))
            return EMFConversionResult(success=False, error=error)

        except Exception as e:
            error = self._create_error(
                operation="convert_to_emf",
                message=f"Conversion error: {e}",
            )
            logger.error("EMF conversion error", name=name, error=str(e), exc_info=True)
            return EMFConversionResult(success=False, error=error)


class _EMFModelConverter:
    """
    Internal converter for graphical models to EMF format.

    This is a translation of the ConvertorHandler from server-experiment.
    """

    def __init__(
        self,
        meta_model_loc: str,
        primitive_types_map: dict[str, str],
    ):
        self._meta_model_loc = meta_model_loc
        self._primitive_types_map = primitive_types_map
        self._root_type = "Specification"

        # Reset state for each conversion
        self._workflow: list[dict[str, Any]] = []
        self._workflow_tasks_dict: dict[str, dict[str, list[str]]] = {}
        self._task_variant_map: dict[str, dict[str, Any]] = {}
        self._experiment_space: list[dict[str, Any]] = []
        self._primitive_types: list[dict[str, Any]] = []

    def _emf_object_type(self, type_name: str) -> str:
        """Get the EMF object $type for the given type name."""
        return f"{self._meta_model_loc}{type_name}"

    def convert(self, graphical_model: dict[str, Any]) -> dict[str, Any]:
        """Convert graphical model to EMF format."""
        # Initialize main workflow
        self._workflow = [{"$id": "workflow-0", "name": "main", "node": [], "link": []}]
        self._workflow[0] = self._convert_workflow(graphical_model, self._workflow[0])

        # Compute deployed workflow combinations
        deployed_workflow_combinations = self._compute_deployed_workflow_combinations()
        deployed_workflows = self._generate_all_deployed_workflows(
            deployed_workflow_combinations
        )

        return {
            "$type": self._emf_object_type(self._root_type),
            "parametertypes": self._primitive_types,
            "workflow": self._workflow,
            "deployedworkflow": deployed_workflows,
            "experimentspace": self._experiment_space,
        }

    def _convert_workflow(
        self,
        graphical_model: dict[str, Any],
        workflow: dict[str, Any],
    ) -> dict[str, Any]:
        """Convert the workflow structure."""
        nodes = graphical_model.get("nodes", [])
        links = graphical_model.get("edges", [])
        node_type_map: dict[str, str] = {}

        for node in nodes:
            emf_node: dict[str, Any] = {}
            node_type = node.get("type", "")

            if node_type == "start":
                emf_node = {
                    "$type": f"{self._meta_model_loc}EventNode",
                    "$id": node["id"],
                }
            elif node_type == "end":
                emf_node = {
                    "$type": f"{self._meta_model_loc}EventNode",
                    "$id": node["id"],
                    "name": "END",
                }
            elif node_type == "task":
                emf_node = self._convert_task_node_to_emf(workflow["$id"], node)
            elif node_type in ("opParallel", "opExclusive", "opInclusive", "opComplex"):
                emf_node = self._convert_operator_node_to_emf(node, nodes, links)

            if emf_node:
                workflow["node"].append(emf_node)
                node_type_map[emf_node["$id"]] = emf_node["$type"]

        for link in links:
            source = link.get("source", "")
            target = link.get("target", "")
            link_type = link.get("type", "")

            if link_type in ("regular", "conditional", "exceptional"):
                source_type = node_type_map.get(source, "")
                target_type = node_type_map.get(target, "")
                if source_type and target_type:
                    emf_link = {
                        "$type": f"{self._meta_model_loc}RegularLink",
                        "$id": link.get("id", generate(size=5)),
                        "output": {"$type": source_type, "$ref": source},
                        "input": {"$type": target_type, "$ref": target},
                    }
                    workflow["link"].append(emf_link)

        return workflow

    def _convert_task_node_to_emf(
        self,
        workflow_id: str,
        node: dict[str, Any],
    ) -> dict[str, Any]:
        """Convert the task node structure."""
        node_id = node["id"]
        self._workflow_tasks_dict.setdefault(workflow_id, {})[node_id] = []

        emf_node = {
            "$type": f"{self._meta_model_loc}Task",
            "$id": node_id,
            "name": node_id,
        }

        data = node.get("data", {})
        for variant in data.get("variants", []):
            variant_id = variant.get("id_task", "")
            if variant_id:
                self._workflow_tasks_dict[workflow_id][node_id].append(variant_id)
                self._task_variant_map[variant_id] = variant

                if variant.get("is_composite"):
                    subflow = {
                        "$id": variant_id,
                        "name": variant.get("name", ""),
                        "node": [],
                        "link": [],
                    }
                    graphical_model = variant.get(
                        "graphical_model", {"nodes": [], "edges": []}
                    )
                    self._workflow.append(
                        self._convert_workflow(graphical_model, subflow)
                    )

        return emf_node

    def _convert_operator_node_to_emf(
        self,
        node: dict[str, Any],
        nodes: list[dict[str, Any]],
        links: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Convert the operator node structure."""
        node_id = node["id"]
        node_type = node.get("type", "")
        node_data = node.get("data", {})

        # Find number of incoming links
        incoming_links = [link for link in links if link.get("target") == node_id]
        if len(incoming_links) > 1:
            return {
                "$type": f"{self._meta_model_loc}{node_type[2:].capitalize()}Join",
                "$id": node_id,
            }

        if node_type == "opParallel":
            return {"$type": f"{self._meta_model_loc}Parallel", "$id": node_id}

        if node_type == "opComplex":
            return {"$type": f"{self._meta_model_loc}Complex", "$id": node_id}

        if node_type == "opExclusive":
            conditions = node_data.get("conditions", [])
            cases = []
            if conditions:
                cases = self._convert_cases(conditions[0], nodes)
            result: dict[str, Any] = {
                "$type": f"{self._meta_model_loc}Exclusive",
                "$id": node_id,
            }
            if cases:
                result["condition"] = {
                    "$id": f"condition-{generate(size=5)}",
                    "cases": cases,
                }
            return result

        # opInclusive
        conditions = node_data.get("conditions", [])
        return {
            "$type": f"{self._meta_model_loc}Inclusive",
            "$id": node_id,
            "conditions": [
                {
                    "$id": f"condition-{generate(size=5)}",
                    "cases": self._convert_cases(condition, nodes),
                }
                for condition in conditions
            ],
        }

    def _convert_cases(
        self,
        condition: dict[str, Any],
        nodes: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Convert the cases of the operator node."""
        return [
            {
                "$id": f"case-{generate(size=5)}",
                "case": case.get("condition", ""),
                "target": {
                    "$type": self._find_node_emf_type(
                        case.get("targetNodeId", ""), nodes
                    ),
                    "$ref": case.get("targetNodeId", ""),
                },
            }
            for case in condition.get("cases", [])
        ]

    def _find_node_emf_type(self, node_id: str, nodes: list[dict[str, Any]]) -> str:
        """Find the EMF type for a node."""
        if not node_id:
            return ""

        node = next((n for n in nodes if n.get("id") == node_id), None)
        if not node:
            return ""

        type_map = {
            "start": "EventNode",
            "end": "EventNode",
            "task": "Task",
            "opParallel": "Parallel",
            "opExclusive": "Exclusive",
            "opInclusive": "Inclusive",
            "opComplex": "Complex",
        }
        return self._emf_object_type(type_map.get(node.get("type", ""), ""))

    def _compute_deployed_workflow_combinations(
        self,
    ) -> dict[str, list[tuple[str, ...]]]:
        """Compute all possible combinations of deployed workflows."""
        return {
            workflow_id: list(itertools.product(*tasks.values()))
            for workflow_id, tasks in self._workflow_tasks_dict.items()
        }

    def _generate_all_deployed_workflows(
        self,
        deployed_workflow_combinations: dict[str, list[tuple[str, ...]]],
    ) -> list[dict[str, Any]]:
        """Generate all deployed workflows based on combinations."""
        deployed_workflows = []
        for workflow_id, combinations in deployed_workflow_combinations.items():
            for tasks in combinations:
                tasks_dict = dict(
                    zip(
                        self._workflow_tasks_dict[workflow_id].keys(),
                        tasks,
                        strict=False,
                    )
                )
                deployed_workflows.append(
                    self._generate_deployed_workflow(workflow_id, tasks_dict)
                )
        return deployed_workflows

    def _generate_deployed_workflow(
        self,
        workflow_id: str,
        tasks_dict: dict[str, str],
    ) -> dict[str, Any]:
        """Generate a single deployed workflow."""
        deployed_workflow_id = f"deployedworkflow-{generate(size=5)}"

        parameter_list = [
            parameter
            for variant_id in tasks_dict.values()
            if variant_id in self._task_variant_map
            for parameter in self._task_variant_map[variant_id].get("parameters", [])
        ]

        self._experiment_space.append(
            self._generate_experiment_space(deployed_workflow_id, parameter_list)
        )

        return {
            "$type": self._emf_object_type("DeployedWorkflow"),
            "$id": deployed_workflow_id,
            "workflow": {
                "$type": self._emf_object_type("Workflow"),
                "$ref": workflow_id,
            },
            "configuredtask": [
                {
                    "$id": f"configuredtask-{generate(size=5)}",
                    "name": self._task_variant_map.get(variant_id, {}).get("name"),
                    "description": self._task_variant_map.get(variant_id, {}).get(
                        "description"
                    ),
                    "implementationRef": self._task_variant_map.get(variant_id, {}).get(
                        "implementationRef"
                    ),
                    "configuration": {
                        "$type": self._emf_object_type("Task"),
                        "$ref": task_id,
                    },
                    "parameters": [
                        {
                            "$type": self._emf_object_type("StaticParameter"),
                            "$id": deployed_workflow_id + parameter.get("id", ""),
                            "name": parameter.get("name"),
                            "type": self._generate_primitive_type(
                                parameter.get("type")
                            ),
                        }
                        for parameter in self._task_variant_map.get(variant_id, {}).get(
                            "parameters", []
                        )
                    ],
                }
                for task_id, variant_id in tasks_dict.items()
            ],
        }

    def _generate_experiment_space(
        self,
        deployed_workflow_id: str,
        parameters: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generate the experiment space."""
        parameter_domain = [
            {
                "$id": f"parameterdomain-{generate(size=10)}",
                "name": parameter.get("name"),
                "type": self._generate_primitive_type(parameter.get("type")),
                "value": value,
                "staticparameter": {
                    "$type": self._emf_object_type("StaticParameter"),
                    "$ref": deployed_workflow_id + parameter.get("id", ""),
                },
            }
            for parameter in parameters
            for value in parameter.get("values", [])
        ]

        return {
            "$id": f"experimentspace-{generate(size=10)}",
            "deployedworkflow": {
                "$type": self._emf_object_type("DeployedWorkflow"),
                "$ref": deployed_workflow_id,
            },
            "parameterdomain": parameter_domain,
        }

    def _generate_primitive_type(self, type_name: str | None) -> dict[str, str] | None:
        """Generate a primitive type reference."""
        if not type_name:
            return None

        mapped_type = self._primitive_types_map.get(type_name, "STRING")

        # Check if type already exists
        existing = next(
            (p for p in self._primitive_types if p.get("type") == mapped_type),
            None,
        )

        if not existing:
            new_type = {
                "$type": self._emf_object_type("PrimitiveType"),
                "$id": f"primitive-{generate(size=3)}",
                "type": mapped_type,
                "name": mapped_type,
            }
            self._primitive_types.append(new_type)
            existing = new_type

        return {
            "$type": self._emf_object_type("PrimitiveType"),
            "$ref": existing["$id"],
        }


# Global client instance
_emf_client: EMFClient | None = None


def get_emf_client() -> EMFClient:
    """Get or create the global EMF client."""
    global _emf_client
    if _emf_client is None:
        _emf_client = EMFClient()
    return _emf_client


async def close_emf_client() -> None:
    """Close the global EMF client."""
    global _emf_client
    if _emf_client is not None:
        await _emf_client.close()
        _emf_client = None

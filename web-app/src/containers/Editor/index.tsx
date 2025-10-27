import "reactflow/dist/style.css";
import "./style.scss";

import React, { useState, useEffect, useCallback } from "react";

import ReactFlow, {
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
  Controls,
  Background,
  MiniMap,
} from "reactflow";

import { shallow } from "zustand/shallow";
import {
  useReactFlowInstanceStore,
  RFState,
} from "../../stores/reactFlowInstanceStore";

import { useConfigPanelStore } from "../../stores/configPanelStore";

import { useNavigate, useLocation } from "react-router-dom";
import useRequest from "../../hooks/useRequest";
import { message } from "../../utils/message";

import Header from "../../components/editor/Header";
import Panel from "../../components/editor/Panel";
import Popover from "../../components/general/Popover";
import Validation from "../../components/editor/Validation";

import {
  defaultGraphicalModel,
  defaultWorkflow,
  WorkflowType,
  GraphicalModelType,
} from "../../types/workflows";

import { TaskType, TaskVariantType } from "../../types/task";

import {
  TaskResponseType,
  WorkflowResponseType,
  UpdateGraphicalModelResponseType,
  CreateWorkflowResponseType,
  CreateTaskResponseType,
  // ExecutionResponseType,
} from "../../types/requests";

import Markers from "../../components/editor/notations/edges/Markers";
import { nodeTypes, edgeTypes } from "./notationTypes";

import { removeTab, setSelectedTab, useTabStore } from "../../stores/tabStore";
import ConfigPanel from "../../components/editor/ConfigPanel";
import { defaultCondition } from "../../types/operator";
import { nanoid } from "nanoid";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  setSelectedNode: state.setSelectedNode,
  selectedLink: state.selectedLinkType,
  setSelectedLink: state.setSelectedLinkType,
  addNode: state.addNode,
  onConnect: state.onConnect,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onDragOver: state.onDragOver,
  updateNodeData: state.updateNodeData,
});

const Editor = () => {
  const { request: specificationRequest } = useRequest<
    WorkflowResponseType | TaskResponseType
  >();

  const { request: updateGraphRequest } =
    useRequest<UpdateGraphicalModelResponseType>();

  const { request: createNewSpecRequest } = useRequest<
    CreateWorkflowResponseType | CreateTaskResponseType
  >();

  const {
    selectedLink,
    nodes,
    edges,
    setSelectedNode,
    onNodesChange,
    onEdgesChange,
    setSelectedLink,
    setNodes,
    setEdges,
    addNode,
    onConnect,
    onDragOver,
    updateNodeData,
  } = useReactFlowInstanceStore(selector, shallow);

  const navigate = useNavigate();
  const specificationType = useLocation().pathname.split("/")[2];
  const workID = useLocation().pathname.split("/")[4];

  const [workflow, setWorkflow] = useState<WorkflowType | TaskType>(
    defaultWorkflow
  );
  const [graphicalModel, setGraphicalModel] = useState(defaultGraphicalModel);

  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance>(Object);

  // Fetch the workflow or task
  useEffect(() => {
    let url = "";
    specificationType === "workflow"
      ? (url = `/api/workflows/${workID}`)
      : (url = `/api/tasks/${workID}`);

    specificationRequest({
      url: url,
    })
      .then((data) => {
        let newWorkflow: WorkflowType | TaskType = defaultWorkflow;
        if (specificationType === "workflow") {
          if ("workflow" in data.data) {
            newWorkflow = data.data.workflow as WorkflowType;
          }
        } else {
          if ("task" in data.data) {
            newWorkflow = data.data.task;
          }
        }
        setWorkflow(newWorkflow);
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  }, []);

  useEffect(() => {
    setGraphicalModel(workflow.graphical_model);
  }, [workflow]);

  useEffect(() => {
    setNodes(graphicalModel.nodes);
    setEdges(graphicalModel.edges);
  }, [graphicalModel]);

  // Tabs management
  const tabs = useTabStore((state) => state.tabs);
  const selectedTab = useTabStore((state) => state.selectedTab);

  function traverseGraphicalModel(
    graphicalModel: GraphicalModelType,
    callback: (node: Node) => void
  ) {
    graphicalModel.nodes.forEach((node) => {
      callback(node as unknown as Node);
      if (node.type === "task") {
        const task = node.data.variants.find(
          (t: TaskVariantType) => t.id_task === node.data.currentVariant
        );
        if (task.is_composite && task.graphical_model) {
          traverseGraphicalModel(task.graphical_model, callback);
        }
      }
    });
  }

  const handleSelectTab = (id: string) => {
    if (isOpenConfig) {
      useConfigPanelStore.setState({ isOpenConfig: false });
    }
    handleSave();
    setSelectedTab(id);
  };

  useEffect(() => {
    if (selectedTab === "main") {
      setNodes(graphicalModel.nodes);
      setEdges(graphicalModel.edges);
    } else {
      let newGraph: GraphicalModelType = defaultGraphicalModel;
      traverseGraphicalModel(graphicalModel, (node) => {
        if (node.type === "task") {
          const task = node.data.variants.find(
            (t: TaskVariantType) => t.id_task === node.data.currentVariant
          );
          if (task.id_task === selectedTab) {
            newGraph = task.graphical_model;
            setNodes(newGraph.nodes);
            setEdges(newGraph.edges);
          }
        }
      });
    }
  }, [selectedTab]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab("main");
    }
  }, [selectedTab, tabs]);

  // Node Drag and Drop
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const { nodeType, data } = JSON.parse(
        event.dataTransfer.getData("application/reactflow")
      );
      // check if the dropped element is valid
      if (typeof nodeType === "undefined" || !nodeType) {
        return;
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(nodeType, position, data);
    },
    [reactFlowInstance, nodes]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => {
        removeTab(node.id);
      });
      traverseGraphicalModel({ nodes: deleted, edges }, (node) => {
        if (node.type === "task") {
          const task = node.data.variants.find(
            (t: TaskVariantType) => t.id_task === node.data.currentVariant
          );
          tabs.forEach((tab) => {
            if (tab.id === task.id_task) {
              removeTab(task.id_task);
            }
          });
        }
      });
    },
    [nodes, edges]
  );

  // Save and Save As

  const [showPopover, setShowPopover] = useState(false);
  const [newWorkName, setNewWorkName] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [nodes, edges]);

  const updateGraphicalModel = (graph: GraphicalModelType) => {
    let url = "";
    specificationType === "workflow"
      ? (url = `/api/workflows/${workID}/update`)
      : (url = `/api/tasks/${workID}/update`);
    const payload =
      specificationType === "workflow"
        ? { graphical_model: graph, work_name: workflow.name }
        : { graphical_model: graph, task_name: "ok" };
    updateGraphRequest({
      url: url,
      method: "PUT",
      data: payload,
    })
      .then(() => {
        message("Saved", 500);
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  };

  function getCurrentGraphOnBoard() {
    let newGraph: GraphicalModelType = defaultGraphicalModel;
    // Get the latest nodes from Zustand store, not from stale graphicalModel
    const currentNodes = useReactFlowInstanceStore.getState().nodes;
    const currentEdges = useReactFlowInstanceStore.getState().edges;

    if (selectedTab === "main") {
      newGraph = { nodes: currentNodes, edges: currentEdges };
    } else {
      // Use latest nodes from Zustand, not graphicalModel
      const updatedGraphicalModel = { nodes: currentNodes, edges: currentEdges };
      traverseGraphicalModel(updatedGraphicalModel, (node) => {
        if (node.type === "task") {
          const task = node.data.variants.find(
            (t: TaskVariantType) => t.id_task === node.data.currentVariant
          );
          if (task.id_task === selectedTab) {
            task.graphical_model = { nodes: currentNodes, edges: currentEdges };
            newGraph = updatedGraphicalModel;
          }
        }
      });
    }
    return newGraph;
  }
  const handleSave = () => {
    const graph = getCurrentGraphOnBoard();
    setGraphicalModel(graph);
    updateGraphicalModel(graph);
  };

  const handleShowPopover = () => {
    setShowPopover(true);
    setNewWorkName("Workflow-" + new Date().getTime());
  };

  function closeMask() {
    setShowPopover(false);
  }

  function handleCancelSave() {
    setShowPopover(false);
  }

  function handleSaveAs() {
    closeMask();
    const graphicalModel = getCurrentGraphOnBoard();
    let url = "";
    specificationType === "workflow"
      ? (url = `/api/workflows/create`)
      : (url = `/api/tasks/create`);

    let data = {};
    if (specificationType === "workflow") {
      data = {
        name: newWorkName,
        graphical_model: graphicalModel,
      };
    } else {
      data = {
        name: newWorkName,
        provider: (workflow as TaskType).provider,
        graphical_model: graphicalModel,
      };
    }

    createNewSpecRequest({
      url: url,
      method: "POST",
      data: data,
    })
      .then((data) => {
        let specID = "";
        if ("id_workflow" in data.data) {
          specID = data.data.id_workflow;
        } else if ("id_task" in data.data) {
          specID = data.data.id_task;
        }
        navigate(specificationType === "workflow" ? `/dashboard/workflows` : `/dashboard/categories`);
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  }

  // Config Panel
  const isOpenConfig = useConfigPanelStore((state) => state.isOpenConfig);

  const updateConfigPanel = () => {
    useConfigPanelStore.setState({ isOpenConfig: false });
    setTimeout(() => {
      useConfigPanelStore.setState({ isOpenConfig: true }); // Re-open the panel
    }, 0);
  };

  // initiate Operator Conditions

  const initOperatorConditions = (id: string) => {
    updateNodeData(
      {
        conditions: [
          {
            ...defaultCondition,
            condition_id: "condition-" + nanoid(),
            name: "New Condition",
          },
        ],
      },
      id
    );
  };

  const handleSwitchSelectedNode = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    if (isOpenConfig) {
      updateConfigPanel();
    }

    setSelectedNode(node.id); // Set the selected node in the reactFlowInstanceStore
    useConfigPanelStore.getState().setOutgoingLinks(node, edges); // Set the outgoing links of the selected node
    useConfigPanelStore.setState({ selectedNodeType: node.type });
    useConfigPanelStore.setState({ selectedNodeId: node.id });

    // make sure the conditions are initiated after the node is selected
    if (node.type === "opExclusive" || node.type === "opInclusive") {
      if (node.data.conditions === undefined) {
        initOperatorConditions(node.id);
      }
    }

    if (isOpenConfig) {
      updateConfigPanel();
    }
  };

  const handleOpenConfigPanel = (event: React.MouseEvent, node: Node) => {
    handleSwitchSelectedNode(event, node);

    if (node.type !== "start" && node.type !== "end") {
      updateConfigPanel();
    }
  };

  return (
    <div className="editor">
      <div className="editor__top">
        <Header onSave={handleSave} onSaveAs={handleShowPopover} />
      </div>
      <ReactFlowProvider>
        <div className="editor__bottom">
          <div className="editor__bottom__left">
            <Panel
              selectedLink={selectedLink}
              onLinkSelection={setSelectedLink}
            />
          </div>
          <div className="editor__bottom__middle">
            <div className="editor__bottom__middle__nav">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`editor__bottom__middle__nav__tab ${
                    selectedTab === tab.id ? "selected" : ""
                  }`}
                >
                  {tab.id !== "main" && (
                    <div
                      className="editor__bottom__middle__nav__tab__close"
                      onClick={() => {
                        removeTab(tab.id);
                      }}
                    >
                      <span className="iconfont">&#xe600;</span>
                    </div>
                  )}
                  <p
                    className="editor__bottom__middle__nav__tab__name"
                    onClick={() => handleSelectTab(tab.id)}
                  >
                    {tab.name}
                  </p>
                </div>
              ))}
            </div>
            <div className="editor__bottom__middle__board">
              <div className="editor__bottom__middle__board__main">
                <Markers />
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodesDelete={onNodesDelete}
                  onNodeDoubleClick={handleOpenConfigPanel}
                  onNodeClick={handleSwitchSelectedNode}
                  fitView
                >
                  {isOpenConfig && (
                    <ConfigPanel
                      updateSideBar={updateConfigPanel}
                      onSave={handleSave}
                    />
                  )}
                  <Controls position="top-left" />
                  <Background />
                  <MiniMap nodeColor={"#4fa3bb"} position="bottom-left" />
                  <Validation />
                </ReactFlow>
              </div>
            </div>
          </div>
        </div>
      </ReactFlowProvider>
      <Popover show={showPopover} blankClickCallback={closeMask}>
        <div className="popover__save">
          <div className="popover__save__text">
            {` Save the current specification as a new ${
              specificationType === "workflow" ? "workflow" : "template"
            }`}
          </div>
          <input
            type="text"
            className="popover__save__input"
            placeholder="specification name"
            value={newWorkName}
            onChange={(e) => setNewWorkName(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                handleSaveAs();
              }
            }}
          />
          <div className="popover__save__buttons">
            <button
              className="popover__save__buttons__cancel"
              onClick={handleCancelSave}
            >
              cancel
            </button>
            <button
              className="popover__save__buttons__confirm"
              onClick={handleSaveAs}
            >
              confirm
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default Editor;

import './style.scss';
import { useState, useEffect, useCallback } from 'react';
import useRequest from '../../../hooks/useRequest';
import { message } from '../../../utils/message';
import { timestampToDate } from '../../../utils/timeToDate';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  downloadGraphicalModel,
  uploadGraphicalModel,
} from '../../../utils/fileIO';
import Popover from '../../general/Popover';
import {
  WorkflowType,
  defaultWorkflow,
} from '../../../types/workflows';
import {
  WorkflowsResponseType,
  CreateWorkflowResponseType,
  UpdateWorkflowNameResponseType,
  DeleteWorkflowResponseType,
} from '../../../types/requests';

const Project = () => {
  const [workflows, setWorkflows] = useState([defaultWorkflow]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newWorkName, setNewWorkName] = useState('');

  const [showPopover, setShowPopover] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const isWorkflowEmpty = workflows.length === 0;

  // make sure the expID is the same as the one in the url
  const projID = useLocation().pathname.split('/')[3];

  const { request: workflowsRequest } = useRequest<WorkflowsResponseType>();
  const { request: createWorkflowRequest } =
    useRequest<CreateWorkflowResponseType>();
  const { request: updateWorkNameRequest } =
    useRequest<UpdateWorkflowNameResponseType>();
  const { request: deleteWorkflowRequest } =
    useRequest<DeleteWorkflowResponseType>();

  const navigate = useNavigate();

  const getWorkflows = useCallback(() => {
    workflowsRequest({
      url: `/api/workflows/all`,
    })
      .then((data) => {
        if (data.data.workflows) {
          const workflows = data.data.workflows;
          setWorkflows(workflows);
        }
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  }, [workflowsRequest, projID]);

  useEffect(() => {
    if(projID !== "default" && workflows.indexOf(defaultWorkflow) !== -1)
    getWorkflows();
  }, [projID]);

  const postNewWorkflow = useCallback(
    () => {
      createWorkflowRequest({
        url: `/api/workflows/create`,
        method: 'POST'
      })
        .then(() => {
          getWorkflows();
        })
        .catch((error) => {
          if (error.message) {
            message(error.message);
          }
        });
    },
    [projID, createWorkflowRequest, getWorkflows]
  );

  const handleNewWorkflow = () => {
    postNewWorkflow();
  };

  const handleStartEditingName = (index: number) => {
    setNewWorkName(workflows[index].name);
    if (editingIndex === null) {
      setEditingIndex(index);
    } else {
      setEditingIndex(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingIndex === null) return;
      if (newWorkName === '' || newWorkName === workflows[editingIndex].name) {
        setEditingIndex(null);
        return;
      }
      renameWorkflow();
      setEditingIndex(null);
    }
  };

  const renameWorkflow = () => {
    if (newWorkName === '' || editingIndex === null) return;
    if (newWorkName === workflows[editingIndex].name) return;
    if (newWorkName.length > 35) {
      message('The length of the name should be less than 35 characters.');
      return;
    }
    updateWorkNameRequest({
      url: `/api/workflows/${workflows[editingIndex!].id_workflow}/rename`,
      method: 'PUT',
      data: {
        old_work_name: workflows[editingIndex!].name,
        new_work_name: newWorkName,
      },
    })
      .then(() => {
        getWorkflows();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
  };

  const handleDownloadWorkflow = (index: number) => {
    downloadGraphicalModel(
      workflows[index].graphical_model,
      workflows[index].name
    );
  };

  const handleOpenWorkflow = (workflow: WorkflowType) => {
    navigate(`/editor/workflow/${projID}/${workflow.id_workflow}`);
  };

  function handleOpenPopover(index: number) {
    setDeleteIndex(index);
    setShowPopover(true);
  }

  function closeMask() {
    setShowPopover(false);
    setDeleteIndex(null);
  }

  function handleCancelDelete() {
    closeMask();
  }

  const handleDeleteWorkflow= () => {
    if (deleteIndex === null) return;
    deleteWorkflowRequest({
      url: `/api/workflows/${workflows[deleteIndex].id_workflow}`,
      method: 'DELETE',
      data: {
        work_name: workflows[deleteIndex].name,
      }
    })
      .then(() => {
        getWorkflows();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
    closeMask();
  };

  async function handleImportWorkflow() {
    const model = await uploadGraphicalModel();
    if (!model) {
      return;
    }
    postNewWorkflow();
  }

  return (
    <div className="specification">
      <div className="specification__functions">
        <button
          className="specification__functions__new"
          onClick={handleNewWorkflow}
        >
          new workflow
        </button>
        <button
          className="specification__functions__import"
          onClick={handleImportWorkflow}
        >
          import workflow
        </button>
      </div>
      <div className="specification__contents">
        <div className="specification__contents__header">
          <div className="specification__contents__header__title">
            Workflow
          </div>
          <div className="specification__contents__header__create">
            Created At
          </div>
          <div className="specification__contents__header__update">
            Updated At
          </div>
          <div className="specification__contents__header__operations"></div>
        </div>
        {isWorkflowEmpty ? (
          <div className="specification__contents__empty">
            <span className="iconfont">&#xe6a6;</span>
            <p>Empty Workflows</p>
          </div>
        ) : (
          <ul className="specification__contents__list">
            {workflows.map((specification, index) => (
              <li className="specification__contents__list__item" key={index}>
                <div className="specification__contents__list__item__title">
                  <span
                    title="modify the name"
                    className="iconfont editable"
                    onClick={() => handleStartEditingName(index)}
                  >
                    &#xe63c;
                  </span>
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={newWorkName}
                      onChange={(e) => setNewWorkName(e.target.value)}
                      onKeyUp={handleKeyPress}
                    />
                  ) : (
                    <p>{specification.name}</p>
                  )}
                </div>
                <div className="specification__contents__list__item__create">
                  {timestampToDate(specification.create_at)}
                </div>
                <div className="specification__contents__list__item__update">
                  {timestampToDate(specification.update_at)}
                </div>
                <div className="specification__contents__list__item__operations">
                  <span
                    title="download graphical model"
                    className="iconfont editable"
                    onClick={() => handleDownloadWorkflow(index)}
                  >
                    &#xe627;
                  </span>
                  <span
                    title="delete this specification"
                    className="iconfont editable"
                    onClick={() => handleOpenPopover(index)}
                  >
                    &#xe634;
                  </span>
                  <button
                    title="open specification in the graphical editor"
                    onClick={() => {
                      handleOpenWorkflow(specification);
                    }}
                  >
                    open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Popover show={showPopover} blankClickCallback={closeMask}>
        <div className="popover__delete">
          <div className="popover__delete__text">
            {`Do you want to delete ${
              deleteIndex ? workflows[deleteIndex].name : 'the specification'
            }?`}
          </div>
          <div className="popover__delete__buttons">
            <button
              className="popover__delete__buttons__cancel"
              onClick={handleCancelDelete}
            >
              cancel
            </button>
            <button
              className="popover__delete__buttons__confirm"
              onClick={handleDeleteWorkflow}
            >
              confirm
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default Project;

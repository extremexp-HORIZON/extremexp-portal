import './style.scss';
import { useState, useEffect, useCallback } from 'react';
import useRequest from '../../../hooks/useRequest';
import { message } from '../../../utils/message';
import { timestampToDate, timeNow } from '../../../utils/timeToDate';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  downloadGraphicalModel,
} from '../../../utils/fileIO';
import Popover from '../../general/Popover';
import {
  ExperimentType,
  defaultExperiment,
} from '../../../types/workflows';
import {
  ExperimentsResponseType,
  CreateExperimentResponseType,
  UpdateExperimentNameResponseType,
  DeleteExperimentResponseType,
} from '../../../types/requests';

const ProjectExperiment = () => {
  const [experiments, setExperiments] = useState<ExperimentType[]>([defaultExperiment]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newExpName, setNewExpName] = useState('');

  const [showPopover, setShowPopover] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const isExperimentEmpty = experiments.length === 0;

  // make sure the expID is the same as the one in the url
  const projID = useLocation().pathname.split('/')[3];

  const { request: experimentsRequest } = useRequest<ExperimentsResponseType>();
  const { request: createExperimentRequest } =
    useRequest<CreateExperimentResponseType>();
  const { request: updateExpNameRequest } =
    useRequest<UpdateExperimentNameResponseType>();
  const { request: deleteExperimentRequest } =
    useRequest<DeleteExperimentResponseType>();

  const navigate = useNavigate();

  const getExperiments = useCallback(() => {
    experimentsRequest({
      url: `/api/experiments/all`,
    })
      .then((data) => {
        if (data.data.experiments) {
          const experiments = data.data.experiments;
          setExperiments(experiments);
        }
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  }, [experimentsRequest, projID]);

  useEffect(() => {
    getExperiments();
  }, []);

  const postNewExperiment = useCallback(
    () => {
      createExperimentRequest({
        url: `/api/experiments/create`,
        method: 'POST'
      })
        .then(() => {
          getExperiments();
        })
        .catch((error) => {
          if (error.message) {
            message(error.message);
          }
        });
    },
    [projID, createExperimentRequest, getExperiments]
  );

  const handleNewExperiment = () => {
    postNewExperiment();
  };

  const handleStartEditingName = (index: number) => {
    setNewExpName(experiments[index].name);
    if (editingIndex === null) {
      setEditingIndex(index);
    } else {
      setEditingIndex(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingIndex === null) return;
      if (newExpName === '' || newExpName === experiments[editingIndex].name) {
        setEditingIndex(null);
        return;
      }
      renameExperiment();
      setEditingIndex(null);
    }
  };

  const renameExperiment = () => {
    if (newExpName === '' || editingIndex === null) return;
    if (newExpName === experiments[editingIndex].name) return;
    if (newExpName.length > 35) {
      message('The length of the name should be less than 35 characters.');
      return;
    }
    updateExpNameRequest({
      url: `/api/experiments/${experiments[editingIndex!].id_experiment}/rename`,
      method: 'PUT',
      data: {
        old_exp_name: experiments[editingIndex!].name,
        new_exp_name: newExpName,
      },
    })
      .then(() => {
        getExperiments();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
  };

  const handleDownloadExperiment = (index: number) => {
    downloadGraphicalModel(
      experiments[index].steps,
      experiments[index].name
    );
  };

  const handleOpenExperiment = (experiment: ExperimentType) => {
    navigate(`/editor/experiment/${projID}/${experiment.id_experiment}`);
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

  const handleDeleteExperiment = () => {
    if (deleteIndex === null) return;
    deleteExperimentRequest({
      url: `/api/experiments/${experiments[deleteIndex].id_experiment}`,
      method: 'DELETE',
      data: { name: experiments[deleteIndex].name },
    })
      .then(() => {
        getExperiments();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
    closeMask();
  };


  return (
    <div className="specification">
      <div className="specification__functions">
        <button
          className="specification__functions__new"
          onClick={handleNewExperiment}
        >
          new experiment
        </button>
      </div>
      <div className="specification__contents">
        <div className="specification__contents__header">
          <div className="specification__contents__header__title">
            Experiment
          </div>
          <div className="specification__contents__header__create">
            Created At
          </div>
          <div className="specification__contents__header__update">
            Updated At
          </div>
          <div className="specification__contents__header__operations"></div>
        </div>
        {isExperimentEmpty ? (
          <div className="specification__contents__empty">
            <span style={{ userSelect: "none" }} className="iconfont">&#xe6a6;</span>
            <p style={{ userSelect: "none" }}>Empty Experiments</p>
          </div>
        ) : (
          <ul className="specification__contents__list">
            {experiments.map((specification, index) => (
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
                      value={newExpName}
                      onChange={(e) => setNewExpName(e.target.value)}
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
                    onClick={() => handleDownloadExperiment(index)}
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
                      handleOpenExperiment(specification);
                    }}
                  >
                    open
                  </button>
                  <button
                    className="analyze_button"
                    title="run experiment"
                  >
                    run
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
              deleteIndex ? experiments[deleteIndex].name : 'the specification'
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
              onClick={handleDeleteExperiment}
            >
              confirm
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default ProjectExperiment;

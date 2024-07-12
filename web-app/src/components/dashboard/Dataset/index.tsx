import './style.scss';
import { useState, useEffect, useCallback } from 'react';
import useRequest from '../../../hooks/useRequest';
import { message } from '../../../utils/message';
import {timeNow, timestampToDate} from '../../../utils/timeToDate';
import { useLocation } from 'react-router-dom';
import Popover from '../../general/Popover';
import {
  defaultDataset,
} from '../../../types/dataset';
import {
  DatasetsResponseType,
  CreateDatasetResponseType,
  UpdateDatasetNameResponseType,
  DeleteExperimentResponseType,
} from '../../../types/requests';

const Organization = () => {
  const [datasets, setDatasets] = useState([defaultDataset]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newDatasetName, setNewDatasetName] = useState('');

  const [showPopover, setShowPopover] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const isDatasetEmpty = datasets.length === 0;

  // make sure the expID is the same as the one in the url
  const projID = useLocation().pathname.split('/')[3];

  const { request: datasetsRequest } = useRequest<DatasetsResponseType>();
  const { request: createDatasetRequest } =
      useRequest<CreateDatasetResponseType>();
  const { request: updateDatasetNameRequest } =
    useRequest<UpdateDatasetNameResponseType>();
  const { request: deleteDatasetRequest } =
    useRequest<DeleteExperimentResponseType>();

  const getDatasets = useCallback(() => {
    datasetsRequest({
      url: `exp/projects/${projID}/datasets`,
    })
      .then((data) => {
        if (data.data.datasets) {
          const datasets = data.data.datasets;
          setDatasets(datasets);
        }
      })
      .catch((error) => {
        if (error.message) {
          message(error.message);
        }
      });
  }, [datasetsRequest, projID]);

  useEffect(() => {
    getDatasets();
  }, [getDatasets]);

  const postNewDataset = useCallback(
      (name: string) => {
        createDatasetRequest({
          url: `/exp/projects/${projID}/datasets/create`,
          method: 'POST',
          data: {
            dataset_name: name,
          },
        })
            .then(() => {
              getDatasets();
            })
            .catch((error) => {
              if (error.message) {
                message(error.message);
              }
            });
      },
      [projID, createDatasetRequest, getDatasets]
  );

  const handleNewDataset = () => {
    // TODO Orestis to refactor and add custom form for uploading files here
    postNewDataset(`dataset-${timeNow()}`);
  };

  const handleStartEditingName = (index: number) => {
    setNewDatasetName(datasets[index].name);
    if (editingIndex === null) {
      setEditingIndex(index);
    } else {
      setEditingIndex(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingIndex === null) return;
      if (newDatasetName === '' || newDatasetName === datasets[editingIndex].name) {
        setEditingIndex(null);
        return;
      }
      renameDataset();
      setEditingIndex(null);
    }
  };

  const renameDataset = () => {
    if (newDatasetName === '' || editingIndex === null) return;
    if (newDatasetName === datasets[editingIndex].name) return;
    if (newDatasetName.length > 35) {
      message('The length of the name should be less than 35 characters.');
      return;
    }
    updateDatasetNameRequest({
      url: `/exp/projects/${projID}/datasets/${
        datasets[editingIndex!].id_dataset
      }/update/name`,
      method: 'PUT',
      data: {
        dataset_name: newDatasetName,
      },
    })
      .then(() => {
        getDatasets();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
  };

  const handleDownloadDataset = (index: number) => {
    // TODO Orestis/Ilias to implement this at the end
    console.log(index)
    message("TODO")
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

  const handleDeleteDataset = () => {
    if (deleteIndex === null) return;
    deleteDatasetRequest({
      url: `/exp/projects/${projID}/datasets/${datasets[deleteIndex].id_dataset}/delete`,
      method: 'DELETE',
    })
      .then(() => {
        getDatasets();
      })
      .catch((error) => {
        message(error.response.data?.message || error.message);
      });
    closeMask();
  };

  return (
    <div className="specification">
      <div className="specification__functions" style={{width: 0}}>
        <button
          className="specification__functions__new"
          onClick={handleNewDataset}
        >
          new dataset
        </button>
      </div>
      <div className="specification__contents">
        <div className="specification__contents__header">
          <div className="specification__contents__header__title">
            Dataset
          </div>
          <div className="specification__contents__header__create">
            Created At
          </div>
          <div className="specification__contents__header__update">
            Updated At
          </div>
          <div className="specification__contents__header__operations"></div>
        </div>
        {isDatasetEmpty ? (
          <div className="specification__contents__empty">
            <span className="iconfont">&#xe6a6;</span>
            <p>Empty Datasets</p>
          </div>
        ) : (
          <ul className="specification__contents__list">
            {datasets.map((specification, index) => (
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
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
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
                    onClick={() => handleDownloadDataset(index)}
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
              deleteIndex ? datasets[deleteIndex].name : 'the dataset'
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
              onClick={handleDeleteDataset}
            >
              confirm
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default Organization;

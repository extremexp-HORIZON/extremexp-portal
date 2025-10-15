import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ChevronRight,
  Clock,
  User,
  FolderOpen,
  MoreVertical,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import useRequest from '../../hooks/useRequest';
import { message } from '../../utils/message';
import { timestampToDate } from '../../utils/timeToDate';
import { Outlet, useNavigate } from 'react-router-dom';
import { defaultProject } from '../../types/workflows';
import Popover from '../../components/general/Popover';
import {
  ProjectsResponseType,
  CreateProjectResponseType,
  UpdateProjectResponseType,
  DeleteProjectResponseType,
} from '../../types/requests';

const Redesign = () => {
  const [projects, setProjects] = useState([defaultProject]);
  const [currentProj, setCurrentProj] = useState(defaultProject);
  const [searchInput, setSearchInput] = useState('');
  const [createprojName, setCreateProjName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [projNameInput, setProjNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { request: projectsRequest } = useRequest<ProjectsResponseType>();
  const { request: createProjectRequest } = useRequest<CreateProjectResponseType>();
  const { request: updateProjectRequest } = useRequest<UpdateProjectResponseType>();
  const { request: deleteProjectRequest } = useRequest<DeleteProjectResponseType>();

  const navigate = useNavigate();
  const isProjectsEmpty = projects.length === 0;

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      return project.name.toLowerCase().includes(searchInput.toLowerCase());
    });
  }, [projects, searchInput]);

  const getProjects = useCallback(() => {
    projectsRequest({
      url: `/api/projects`,
    })
      .then((data) => {
        if (data.data.projects) {
          setProjects(data.data.projects);
        }
      })
      .catch((error) => {
        if (error.name === 'AxiosError') {
          message('Please login first');
        }
      });
  }, [projectsRequest]);

  useEffect(() => {
    getProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0 && currentProj.id_project === 'default') {
      setCurrentProj(projects[0]);
    }
  }, [projects, currentProj.id_project]);

  useEffect(() => {
    navigate(`/dashboard/projects/${currentProj?.id_project}/experiments`);
  }, [currentProj.id_project]);

  const isProjectNameValid = (name: string) => {
    if (!name) {
      message('Project name can not be empty');
      return false;
    }
    if (name.length > 50) {
      message('Project name should be less than 50 characters');
      return false;
    }
    return true;
  };

  const handleCreateProject = () => {
    if (!isProjectNameValid(createprojName)) return;
    createProjectRequest({
      url: `/api/projects/create`,
      method: 'POST',
      data: {
        name: createprojName,
      },
    })
      .then(() => {
        getProjects();
        setShowCreateModal(false);
        setCreateProjName('');
      })
      .catch((error) => {
        if (error.name === 'AxiosError') {
          message('Please login first');
        }
        message(error.response.data?.message || 'unknown error');
      });
  };

  const handleSelectProject = (index: number) => {
    if (isEditing) return;
    setCurrentProj(filteredProjects[index]);
  };

  const handleStartEditing = () => {
    setProjNameInput(currentProj.name);
    setDescriptionInput(currentProj.description);
    setIsEditing(!isEditing);
  };

  const handleChangeNameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateProjectInfo();
    }
  };

  const handleChangeDescriptionKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      updateProjectInfo();
    }
  };

  const updateProjectInfo = () => {
    setIsEditing(false);
    if (!isProjectNameValid(projNameInput)) return;
    if (
      currentProj.name === projNameInput &&
      currentProj.description === descriptionInput
    ) {
      return;
    }

    updateProjectRequest({
      url: `/api/projects/rename/${currentProj.id_project}`,
      method: 'PUT',
      data: {
        name: projNameInput,
        description: descriptionInput,
      },
    })
      .then(() => {
        window.location.reload();
      })
      .catch((error) => {
        if (error.name === 'AxiosError') {
          message('Please login first');
        }
        message(error.response.data?.message || 'unknown error');
      });
  };

  const handleDeleteProject = () => {
    deleteProjectRequest({
      url: `/api/projects/delete/${currentProj.id_project}`,
      method: 'DELETE',
    })
      .then(() => {
        window.location.reload();
      })
      .catch((error) => {
        if (error.name === 'AxiosError') {
          message('Please login first');
        }
        message(error.response.data?.message || 'unknown error');
      });
    setShowPopover(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 text-white">🧠</div>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">ExtremeXP Portal</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
                <span>Dashboard</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">Experiments</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Projects */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Create Project Section */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    disabled={isEditing}
                  />
                </div>
              </div>

              {/* Projects List */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Projects ({filteredProjects.length})</h3>
                <div className="space-y-2">
                  {filteredProjects.map((project, index) => (
                    <div
                      key={project.id_project}
                      onClick={() => handleSelectProject(index)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentProj.name === project.name
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          currentProj.name === project.name ? 'bg-blue-600' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {timestampToDate(project.update_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isProjectsEmpty ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-500 mb-6">Create your first project to get started with experiments</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Project</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Project Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={projNameInput}
                              onChange={(e) => setProjNameInput(e.target.value)}
                              onKeyUp={handleChangeNameKeyPress}
                              className="text-xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <h2 className="text-xl font-semibold text-gray-900">{currentProj.name}</h2>
                          )}
                          <button
                            onClick={handleStartEditing}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mb-4">
                          {isEditing ? (
                            <textarea
                              value={descriptionInput}
                              onChange={(e) => setDescriptionInput(e.target.value)}
                              onKeyUp={handleChangeDescriptionKeyPress}
                              className="w-full text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 resize-none"
                              rows={2}
                            />
                          ) : (
                            <p className="text-gray-600">{currentProj.description || 'No description'}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Updated {timestampToDate(currentProj.update_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowPopover(true)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experiment Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <Outlet />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={createprojName}
                    onChange={(e) => setCreateProjName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popover */}
      <Popover show={showPopover} blankClickCallback={() => setShowPopover(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{currentProj.name}"? All experiments and data will be permanently removed.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowPopover(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default Redesign;
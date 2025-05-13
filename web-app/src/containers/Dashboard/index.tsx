import './style.scss';

import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../../stores/accountStore';

const Repository = () => {
  const location = useLocation();
  const isExperiments = location.pathname.includes('/projects');
  const isTask = location.pathname.includes('/categories');
  const isReusableTask = location.pathname.includes('/reusable_tasks');
  // const isProgress = location.pathname.includes('/progress');
  const isIntents = location.pathname.includes('/intents');
  const isDDM = location.pathname.includes('/ddm');
  const experimentSelectedClass = isExperiments ? 'selected' : '';
  const taskSelectedClass = isTask ? 'selected' : '';
  const reusableTaskSelectedClass = isReusableTask ? 'selected' : '';
  // const progressSelectedClass = isProgress ? 'selected' : '';
  const intentsSelectedClass = isIntents ? 'selected' : '';
  const ddmSelectedClass = isDDM ? 'selected' : '';

  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/account/login');
  };

  return (
    <div className="page repository">
      <div className="repository__panel">
        <div className="repository__panel__header">
          <span>Dashboard</span>
        </div>
        <div className="repository__panel__items">
          <Link to={'/dashboard/projects'}>
            <div
              className={`repository__panel__items__item ${experimentSelectedClass}`}
            >
              <span className="iconfont">&#xe6cf;</span>
              <p>Experiments</p>
            </div>
          </Link>
          <Link to={'/dashboard/categories'}>
            <div
              className={`repository__panel__items__item ${taskSelectedClass}`}
            >
              <span className="iconfont">&#xe610;</span>
              <p>Templates</p>
            </div>
          </Link>
          <Link to={'/dashboard/reusable_tasks'}>
            <div
                className={`repository__panel__items__item ${reusableTaskSelectedClass}`}
            >
              <span className="iconfont">&#xe6f2;</span>
              <p>Tasks</p>
            </div>
          </Link>
          {/* <Link to={'/dashboard/progress'}>
            <div
                className={`repository__panel__items__item ${progressSelectedClass}`}
            >
              <span className="iconfont">&#xe653;</span>
              <p>Progress</p>
            </div>
          </Link> */}
        <Link to={'/dashboard/intents'}>
            <div
                className={`repository__panel__items__item ${intentsSelectedClass}`}
            >
              <span className="iconfont">&#xe653;</span>
              <p>Intents</p>
            </div>
          </Link>
          <Link to={'/dashboard/ddm'}>
            <div
                className={`repository__panel__items__item ${ddmSelectedClass}`}
            >
              <span className="iconfont">&#xe653;</span>
              <p>DDM</p>
            </div>
          </Link>
        </div>
        <div className="repository__panel__sign-out">
          <button
            className="repository__panel__sign-out__button"
            onClick={handleSignOut}
          >
            <span className="iconfont">&#xe6a5;</span>
            <span>sign out</span>
          </button>
        </div>
      </div>
      <div className="repository__content">
        <Outlet />
      </div>
    </div>
  );
};

export default Repository;

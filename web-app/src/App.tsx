import './styles/app.scss';
// import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Home from './containers/Home';
import Account from './containers/Account';
import Login from './containers/Account/Login';
import Register from './containers/Account/Register';
import Dashboard from './containers/Dashboard';
import Experiments from './containers/Dashboard/Experiments';
import Progress from './containers/Dashboard/Progress';
import Intents from './containers/Dashboard/Intents';
import DDM from './containers/Dashboard/DDM';
import ReusableTasks from './containers/Dashboard/ReusableTasks';
import Project from './components/dashboard/Experiment';
import Tasks from './containers/Dashboard/Tasks';
import Category from './components/dashboard/Task';
import Editor from './containers/Editor';
import Execution from './containers/Execution';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/account/',
    element: <Account />,
    children: [
      {
        path: '/account/login',
        element: <Login />,
      },
      {
        path: '/account/register',
        element: <Register />,
      },
    ],
  },
  {
    path: '/dashboard/',
    element: <Dashboard />,
    children: [
      {
        path: '/dashboard/projects',
        element: <Experiments />,
        children: [
          {
            path: '/dashboard/projects/:projID/experiments',
            element: <Project />,
          },
        ],
      },
      {
        path: '/dashboard/categories',
        element: <Tasks />,
        children: [
          {
            path: '/dashboard/categories/:categoryID/tasks',
            element: <Category />,
          },
        ],
      },
      {
        path: '/dashboard/reusable_tasks',
        element: <ReusableTasks />,
      },
      {
        path: '/dashboard/progress',
        element: <Progress />,
      },
      {
        path: '/dashboard/intents',
        element: <Intents />,
      },
      {
        path: '/dashboard/ddm',
        element: <DDM />,
      },
    ],
  },
  {
    path: '/editor/:type/:projID/:experimentID',
    element: <Editor />,
  },
  {
    path: '/execution/convert/:projID/:experimentID',
    element: <Execution />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

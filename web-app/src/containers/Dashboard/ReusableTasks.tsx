import './common.scss';
import './workflows.scss';
import { useAccountStore } from '../../stores/accountStore';

const ReusableTasks = () => {
   const username = useAccountStore((state) => state.username);
    // TODO: Fix the URL for production
  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src={`http://localhost:8080/?folder=/home/user/workspace/${username}`}
        ></iframe>
      </div>
    </>
  );
};

export default ReusableTasks;

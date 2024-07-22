import './common.scss';
import './experiments.scss';

const ReusableTasks = () => {

  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src="https://ide.expvis.smartarch.cz/?folder=/home/user/workspace/"
        ></iframe>
      </div>
    </>
  );
};

export default ReusableTasks;

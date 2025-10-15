import './common.scss';
import './workflows.scss';

const Progress = () => {

  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src="https://vis.extremexp-icom.intracom-telecom.com/"
        ></iframe>
      </div>
    </>
  );
};

export default Progress;

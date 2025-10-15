import './common.scss';
import './experiments.scss';

const DDM = () => {

  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src="https://ddm.extremexp-icom.intracom-telecom.com/"
        ></iframe>
      </div>
    </>
  );
};

export default DDM;

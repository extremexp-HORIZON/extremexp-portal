import './common.scss';
import './experiments.scss';

const Progress = () => {

  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src="https://extreme-viz.pulsar.imsi.athenarc.gr/ideko"
        ></iframe>
      </div>
    </>
  );
};

export default Progress;

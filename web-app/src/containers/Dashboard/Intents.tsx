import './common.scss';
import './experiments.scss';

const Intents = () => {

  return (
    <>
      <div className="page dashboard__page">
        <iframe width="100%" height="100%" style={{border:'none'}}
            src={`${import.meta.env.INTENTS_URL}/intent2Workflow`}
        ></iframe>
      </div>
    </>
  );
};

export default Intents;

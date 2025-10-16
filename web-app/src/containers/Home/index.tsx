import './style.scss';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../stores/accountStore';
import { useEffect } from 'react';

const Home = () => {
  const navigate = useNavigate();
  const isLogin = useAccountStore((state) => state.isLogin);

  useEffect(() => {
    if (isLogin) {
      navigate('/dashboard/experiments');
    } else {
      navigate('/account/login');
    }
  }, []);

  return (
    <>
    </>
    // <div className="home">
    //   <div className="home__banner">
    //     <img src={logo} alt="logo" className="home__banner__logo" />
    //     <div className="home__banner__title">ExtremeXP Portal</div>
    //   </div>
    //   <div className="home__start">
    //     <div className="home__start__button" onClick={handleStart}>
    //       Start
    //     </div>
    //   </div>
    // </div>
  )
};

export default Home;

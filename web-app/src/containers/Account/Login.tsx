import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../../stores/accountStore';
import useRequest from '../../hooks/useRequest';
import { LoginResponseType } from '../../types/requests';
import { message } from '../../utils/message';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { request: loginRequest } = useRequest<LoginResponseType>();

  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username || !password) return message('username or password is empty');

    loginRequest({
      url: `extreme_auth/api/v1/person/login`,
      method: 'POST',
      data: {
        username: username,
        password: password,
      },
    })
      .then((response) => {
        const token = response?.access_token;
        if (token) {
          login(username, token);
          navigate('/dashboard/projects');
        }
      })
      .catch((error) => {
        message(error.response.data?.message || 'The username or password is not correct');
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin(); 
    }
  };

  return (
    <>
      <div className="login__form">
        <div className="login__form__item">
          <div className="login__form__item__title"> username </div>
          <input
            id="username"
            className="login__form__item__content"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="login__form__item">
          <div className="login__form__item__title"> password </div>
          <input
            id="password"
            className="login__form__item__content"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleKeyPress}
          />
        </div>
      </div>
      <button className="login__submit" onClick={handleLogin}>
        LOGIN
      </button>
    </>
  );
};

export default Login;

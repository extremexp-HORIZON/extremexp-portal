import { useState } from 'react';
import useRequest from '../../hooks/useRequest';
import { useNavigate } from 'react-router-dom';
import { message } from '../../utils/message';
import { RegisterResponseType } from '../../types/requests';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { request: registerRequest } = useRequest<RegisterResponseType>();
  const navigate = useNavigate();

  const handleRegister = () => {
    if (!username || !password) return message('username or password is empty');
    if (!fullName || fullName.indexOf(" ") === -1) return message('not a valid full name');
    if (!email || email.indexOf("@") === -1) return message('not a valid email');

    if (password !== confirmPassword) return message('passwords do not match');

    registerRequest({
      url: `extreme_auth/api/v1/person/register`,
      method: 'POST',
      data: {
        username: username,
        password: password,
        email: email,
        name: fullName
      },
    })
      .then((response) => {
        if (response) {
          message('Account created.');
          setTimeout(() => {
            navigate(`/account/login`);
          }, 2000);
        }
      })
      .catch((error) => {
        message(error.response.data?.message || 'unknown error');
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  return (
    <>
      <div className="login__form">
        <div className="login__form__item">
          <div className="login__form__item__title"> full name </div>
          <input
              id="fullName"
              className="login__form__item__content"
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="login__form__item">
          <div className="login__form__item__title"> email </div>
          <input
              id="email"
              className="login__form__item__content"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="login__form__item">
          <div className="login__form__item__title"> username </div>
          <input
            id="username"
            className="login__form__item__content"
            type="text"
            placeholder="Username"
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="login__form__item">
          <div className="login__form__item__title"> confirm password </div>
          <input
            id="confirmPassword"
            className="login__form__item__content"
            type="password"
            placeholder="Repeat Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyUp={handleKeyPress}
          />
        </div>
      </div>
      <button className="login__submit" onClick={handleRegister}>
        REGISTER
      </button>
    </>
  );
};

export default Register;

import { useState, useRef, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { useNavigate } from 'react-router-dom';

import { useAccountStore, logout } from '../stores/accountStore';

// Get the token from localStorage and add it to the request headers

const defaultRequestConfig: AxiosRequestConfig = {
  url: '/',
  method: 'GET',
  data: {},
};

function useRequest<T>(options: AxiosRequestConfig = defaultRequestConfig) {
  const navigate = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const controllerRef = useRef(new AbortController()); // AbortController is used to cancel the request

  const cancelRequest = () => {
    controllerRef.current.abort();
  };

  const request = useCallback(
    (requestOptions?: AxiosRequestConfig) => {
      // Reset state
      setData(null);
      setError(null);
      setLoaded(false);

      const loginToken = useAccountStore.getState().token;
      const params = {};
      const headers =  loginToken ? {
          'Authorization': `Bearer ${loginToken}`
      } : {};
      
      return axios
        .request<T>({
          baseURL: import.meta.env.VITE_API_URL,
          url: requestOptions?.url || '',
          method: requestOptions?.method || options.method,
          signal: controllerRef.current.signal,
          headers: headers,
          params: { ...params, ...requestOptions?.params },
          data: requestOptions?.data || options.data,
        })
        .then((response) => {
          setData(response.data);
          return response.data;
        })
        .catch((error) => {
          if (error?.response?.status === 403) {
            logout();
            navigate('/account/login');
          }
          setError(error);
          throw error;
        })
        .finally(() => {
          setLoaded(true);
        });
    },
    [navigate, options]
  );

  return { data, error, loaded, request, cancelRequest };
}

export default useRequest;

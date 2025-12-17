import ky, { type KyInstance } from 'ky';

/**
 * DAL API Client configuration
 */
export interface DALClientConfig {
  baseUrl: string;
  accessToken?: string;
  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number;
}

const DEFAULT_BASE_URL = 'https://api.dal.extremexp-icom.intracom-telecom.com/api';
const DEFAULT_TIMEOUT = 15000; // 15 seconds

/**
 * Create a DAL API client instance
 */
export const createDALClient = (config: Partial<DALClientConfig> = {}): KyInstance => {
  const baseUrl = config.baseUrl || import.meta.env.VITE_DAL_API_URL || DEFAULT_BASE_URL;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  return ky.create({
    prefixUrl: baseUrl,
    timeout,
    headers: config.accessToken ? { 'access-token': config.accessToken } : undefined,
  });
};

// Default client instance - can be reconfigured
let _client: KyInstance | null = null;
let _accessToken: string | undefined;

/**
 * Get or create the default DAL client
 */
export const getDALClient = (): KyInstance => {
  if (!_client) {
    _client = createDALClient({ accessToken: _accessToken });
  }
  return _client;
};

/**
 * Set the access token for the DAL client
 * This will recreate the client with the new token
 */
export const setDALAccessToken = (token: string | undefined): void => {
  _accessToken = token;
  _client = createDALClient({ accessToken: token });
};

/**
 * Get the current access token
 */
export const getDALAccessToken = (): string | undefined => _accessToken;

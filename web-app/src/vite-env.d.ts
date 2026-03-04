/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Portal backend API base URL.
   *
   * Behavior when unset:
   * - loopback hosts: 'http://localhost:8000'
    * - non-loopback hosts: '/portal-api'
   */
  readonly VITE_PORTAL_API_URL?: string;
  /**
   * Auth API base URL.
   *
   * Behavior when unset:
    * - loopback hosts: 'http://localhost:5521/extreme_auth'
   * - non-loopback hosts: '/extreme_auth'
   */
  readonly VITE_AUTH_API_URL?: string;
  /**
   * DAL API base URL
   * @default 'https://api.dal.extremexp-icom.intracom-telecom.com/api'
   */
  readonly VITE_DAL_API_URL?: string;
  /**
   * DAL Account page URL for obtaining access tokens
   * @default 'https://dal.extremexp-icom.intracom-telecom.com/account/api'
   */
  readonly VITE_DAL_ACCOUNT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

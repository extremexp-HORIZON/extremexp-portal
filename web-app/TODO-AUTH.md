# Authentication Implementation Plan

## Overview

We are migrating the authentication logic from the legacy `web-app` to the `new-web-app`. The goal is to implement a robust, headless authentication layer using `zustand` for state management and `ky` for HTTP requests, replacing the previous `axios` + `zustand` implementation.

## Analysis of Legacy Implementation (`web-app`)

The legacy implementation was relatively simple but lacked some robustness features:

* **State Management**: Used `zustand` with `persist` middleware to store `isLogin`, `username`, and `token` in `localStorage`.
* **HTTP Client**: Used `axios` wrapped in a custom `useRequest` hook.
* **Token Handling**:
  * Manually attached `Authorization: Bearer ${token}` header in `useRequest`.
  * **Missing**: No automatic token refresh logic.
  * **Error Handling**: On 403 (Forbidden), it logged the user out and redirected to login. It did not explicitly handle 401 (Unauthorized) for token expiration.
* **Logout**: Cleared the store and local storage.

## Proposed Implementation (`new-web-app`)

We will adopt the provided "headless auth layer" pattern, which offers significant improvements:

1. **Automatic Token Refresh**: The new `http.ts` module will intercept 401 responses, attempt to refresh the token using a refresh token, and replay the original request.
2. **Better State Tracking**: We will store not just the access token, but also the refresh token and their expiration times.
3. **Separation of Concerns**:
    * `authStore.ts`: Pure state management (Zustand).
    * `http.ts`: HTTP client configuration (Ky) with interceptors.
    * `authApi.ts`: High-level auth operations (login, logout).
    * `useAuth.tsx`: React hook for consuming auth state.

## Implementation Steps

### 1. Dependencies

Install required packages:

```bash
npm install ky zustand
```

### 2. File Structure

Create the following files in `src/auth/` (or `src/stores/` and `src/api/` depending on preference, but keeping them together is often cleaner):

* `src/auth/authStore.ts`
* `src/auth/http.ts`
* `src/auth/authApi.ts`
* `src/auth/useAuth.tsx`

### 3. Code Implementation

#### `src/auth/authStore.ts`

* Adapt the provided snippet.
* **Improvement**: Consider adding `persist` middleware (like the old app) so the user stays logged in across page reloads. The provided snippet is in-memory only.

#### `src/auth/http.ts`

* Implement the `ky` instance with `beforeRequest` (attach token) and `afterResponse` (refresh logic) hooks.
* Ensure the `doRefresh` logic correctly calls the backend endpoint: `extreme_auth/api/v1/person/refresh` (need to verify if this endpoint exists and what it expects).
  * *Note*: The old app didn't seem to use refresh tokens, so we need to verify if the backend supports it. If not, we might need to stick to simple "logout on 401".

#### `src/auth/authApi.ts`

* Implement `login` calling `extreme_auth/api/v1/person/login`.
* Implement `logout`.

#### `src/auth/useAuth.tsx`

* React hook to expose `isAuthenticated`, `user`, etc.

### 4. Integration

* Update `src/App.tsx` or the main router to protect routes using `useAuth`.
* Replace any direct API calls with the `api` instance from `src/auth/http.ts`.

### 5. UI/UX Improvements

The legacy `web-app` login UI was functional but basic. We will improve it in `new-web-app`:

* **Loading State**: The login button must show a loading indicator (spinner or text change) while the request is pending to prevent double submissions.
* **Validation**: Implement proper form validation (e.g., using `react-hook-form` or manual validation) with inline error messages for fields like email format.
* **Responsive Design**: Ensure the login form is fully responsive and looks good on mobile devices (using Tailwind CSS).
* **Feedback**: Provide clear, user-friendly error messages (e.g., "Invalid username or password" instead of generic server errors) via toast notifications or inline alerts.
* **Session Expiry Handling**: Since the backend does not support token refresh, we should implement a proactive session expiry mechanism:
  * Track the token expiration time in the store.
  * When the token is about to expire (or has expired), show a **Re-login Modal** instead of immediately redirecting the user to the login page.
  * This allows the user to re-authenticate without losing their current context (e.g., unsaved form data).

## Open Questions / Verification

* **Refresh Token Endpoint**: Does `extreme_auth/api/v1/person/refresh` exist? The old app didn't use it. We need to check the `access-control-service` or `keycloak` configuration.
  * *Action*: Check `access-control-service` code or documentation if available.
* **Token Persistence**: The snippet uses in-memory storage. We should probably add `persist` from `zustand/middleware` to keep users logged in.

### 6. Developer Tips & Resources

* **Proxy Setup**: The development environment uses Nginx to proxy requests. You don't need to configure absolute URLs (like `http://localhost:5000`). Just use relative paths (e.g., `extreme_auth/api/...`), and the proxy will handle the rest.
* **DevTools**: Use the Browser DevTools (Network tab) to inspect the login request. You should see the `access_token` in the response.
* **Local Storage**: If you implement persistence, check the "Application" -> "Local Storage" tab in DevTools to see if the token is saved.
* **Documentation**:
  * [Ky (HTTP Client)](https://github.com/sindresorhus/ky)
  * [Zustand (State Management)](https://github.com/pmndrs/zustand)
  * [React Hook Form](https://react-hook-form.com/) (Recommended for validation)

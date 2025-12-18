import { useState } from 'react';

const DEFAULT_DAL_ACCOUNT_URL = 'https://dal.extremexp-icom.intracom-telecom.com/account/api';

interface DALTokenPromptProps {
  onTokenSet: (token: string) => void;
}

/**
 * Component to prompt user for DAL access token
 *
 * Displays an input field with a link to the DAL account page
 * where users can obtain their access token.
 *
 * SECURITY NOTE: This is a temporary PoC solution. In production,
 * proper OAuth2/OIDC flow should be implemented.
 */
export default function DALTokenPrompt({ onTokenSet }: DALTokenPromptProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dalAccountUrl = import.meta.env.VITE_DAL_ACCOUNT_URL || DEFAULT_DAL_ACCOUNT_URL;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) return;

    setIsSubmitting(true);
    // Small delay for UX feedback
    setTimeout(() => {
      onTokenSet(trimmedToken);
      setIsSubmitting(false);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-warning/20 p-4">
          <svg
            className="size-8 text-warning"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">DAL Access Token Required</h3>
        <p className="max-w-sm text-sm text-neutral-600">
          To view experiments from DAL, please provide your access token.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
        <div className="form-control w-full">
          <label className="label" htmlFor="dal-token-input">
            <span className="label-text font-medium">Access Token</span>
          </label>
          <input
            id="dal-token-input"
            type="password"
            placeholder="Paste your DAL access token here"
            className="input input-bordered w-full"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!tokenInput.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Setting...
            </>
          ) : (
            'Set Token'
          )}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-neutral-500">
          Don&apos;t have an access token?
        </p>
        <a
          href={dalAccountUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm gap-2"
        >
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          Get Token from DAL
        </a>
      </div>

      {/* Security warning */}
      <div className="alert alert-warning max-w-md">
        <svg
          className="size-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div className="text-xs">
          <span className="font-semibold">Prototype mode:</span> Token will be stored in sessionStorage
          for this browser session only. This is not secure for production use.
        </div>
      </div>
    </div>
  );
}

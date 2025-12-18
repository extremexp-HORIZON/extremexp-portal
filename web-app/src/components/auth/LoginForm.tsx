import { useForm } from "react-hook-form";
import { useState } from "react";
import { login, isApiError } from "../../auth";

interface LoginFormData {
  username: string;
  password: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * Login form component with DaisyUI styling and react-hook-form validation.
 *
 * Features:
 * - Inline validation errors
 * - Loading state indicator
 * - API error display
 * - Keyboard navigation (Enter to submit)
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setIsSubmitting(true);

    try {
      await login(data);
      onSuccess?.();
    } catch (error) {
      if (isApiError(error)) {
        setApiError(error.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* API Error Alert */}
      {apiError && (
        <div role="alert" className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{apiError}</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setApiError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Username Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Username</legend>
        <input
          type="text"
          placeholder="Enter your username"
          className={`input w-full ${errors.username ? "input-error" : ""}`}
          autoComplete="username"
          disabled={isSubmitting}
          {...register("username", {
            required: "Username is required",
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
          })}
        />
        {errors.username && (
          <p className="fieldset-label text-error">{errors.username.message}</p>
        )}
      </fieldset>

      {/* Password Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Password</legend>
        <input
          type="password"
          placeholder="Enter your password"
          className={`input w-full ${errors.password ? "input-error" : ""}`}
          autoComplete="current-password"
          disabled={isSubmitting}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 4,
              message: "Password must be at least 4 characters",
            },
          })}
        />
        {errors.password && (
          <p className="fieldset-label text-error">{errors.password.message}</p>
        )}
      </fieldset>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Logging in...
          </>
        ) : (
          "Login"
        )}
      </button>
    </form>
  );
}

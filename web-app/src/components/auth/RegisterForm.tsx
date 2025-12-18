import { useForm } from "react-hook-form";
import { useState } from "react";
import { register as registerApi, isApiError } from "../../auth";

interface RegisterFormData {
  fullName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
}

/**
 * Registration form component with DaisyUI styling and react-hook-form validation.
 *
 * Features:
 * - Comprehensive inline validation
 * - Email format validation
 * - Password confirmation matching
 * - Loading state indicator
 * - API error display
 */
export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      fullName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password for confirm password validation
  const password = watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await registerApi({
        username: data.username,
        password: data.password,
        email: data.email,
        name: data.fullName,
      });
      setSuccessMessage(
        "Account created successfully! You can now log in."
      );
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

      {/* Success Alert */}
      {successMessage && (
        <div role="alert" className="alert alert-success">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Full Name Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Full Name</legend>
        <input
          type="text"
          placeholder="Enter your full name"
          className={`input w-full ${errors.fullName ? "input-error" : ""}`}
          autoComplete="name"
          disabled={isSubmitting}
          {...register("fullName", {
            required: "Full name is required",
            minLength: {
              value: 2,
              message: "Full name must be at least 2 characters",
            },
          })}
        />
        {errors.fullName && (
          <p className="fieldset-label text-error">{errors.fullName.message}</p>
        )}
      </fieldset>

      {/* Email Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Email</legend>
        <input
          type="email"
          placeholder="Enter your email"
          className={`input w-full ${errors.email ? "input-error" : ""}`}
          autoComplete="email"
          disabled={isSubmitting}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Please enter a valid email address",
            },
          })}
        />
        {errors.email && (
          <p className="fieldset-label text-error">{errors.email.message}</p>
        )}
      </fieldset>

      {/* Username Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Username</legend>
        <input
          type="text"
          placeholder="Choose a username"
          className={`input w-full ${errors.username ? "input-error" : ""}`}
          autoComplete="username"
          disabled={isSubmitting}
          {...register("username", {
            required: "Username is required",
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
            pattern: {
              value: /^[a-zA-Z0-9_-]+$/,
              message: "Username can only contain letters, numbers, underscores, and hyphens",
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
          placeholder="Choose a password"
          className={`input w-full ${errors.password ? "input-error" : ""}`}
          autoComplete="new-password"
          disabled={isSubmitting}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        {errors.password && (
          <p className="fieldset-label text-error">{errors.password.message}</p>
        )}
      </fieldset>

      {/* Confirm Password Field */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Confirm Password</legend>
        <input
          type="password"
          placeholder="Repeat your password"
          className={`input w-full ${errors.confirmPassword ? "input-error" : ""}`}
          autoComplete="new-password"
          disabled={isSubmitting}
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) =>
              value === password || "Passwords do not match",
          })}
        />
        {errors.confirmPassword && (
          <p className="fieldset-label text-error">
            {errors.confirmPassword.message}
          </p>
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
            Creating account...
          </>
        ) : (
          "Register"
        )}
      </button>
    </form>
  );
}

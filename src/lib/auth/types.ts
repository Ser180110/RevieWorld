export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_exists"
  | "username_taken"
  | "invalid_username"
  | "invalid_email"
  | "weak_password"
  | "rate_limit"
  | "generic";

export type AuthFormState = { error?: AuthErrorCode; done?: boolean };

export type ResetErrorCode = "invalid_email" | "rate_limit" | "generic";
export type ResetFormState = { error?: ResetErrorCode; done?: boolean };

export type NewPasswordErrorCode = "weak_password" | "mismatch" | "same_password" | "expired" | "generic";
export type NewPasswordFormState = { error?: NewPasswordErrorCode };

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

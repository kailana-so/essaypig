import { AuthErrorMessages, AuthErrors } from "./constants";

export function getFriendlyAuthMessage(code: string): string {
  switch (code) {
    case AuthErrors.INVALID_EMAIL:
      return AuthErrorMessages.INVALID_EMAIL;
    case AuthErrors.INVALID_CRED:
      return AuthErrorMessages.INVALID_CRED;
    case AuthErrors.WEAK_PASSWORD:
      return AuthErrorMessages.WEAK_PASSWORD;
    case AuthErrors.USER_NOT_FOUND:
      return AuthErrorMessages.USER_NOT_FOUND;
    case AuthErrors.WRONG_PASSWORD:
      return AuthErrorMessages.WRONG_PASSWORD;
    case AuthErrors.USER_EXISTS:
      return AuthErrorMessages.USER_EXISTS;
    default:
      return AuthErrorMessages.UNKNOWN_ERROR;
  }
}

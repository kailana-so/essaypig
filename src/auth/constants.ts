export const AuthErrorMessages = {
    INVALID_EMAIL: "You sure about that email address?",
    INVALID_CRED: "Well, something's not right with that password or email.",
    WEAK_PASSWORD: "Come on, passwords should be at least 6 characters.",
    USER_NOT_FOUND: "Sorry, I dont think we know you. Sign up?.",
    WRONG_PASSWORD: "psst, incorrect password.",
    USER_EXISTS: "You're already in. Sign in?",
    UNKNOWN_ERROR: "Sorry, not sure what happened."
} as const;

export const AuthErrors = {
    INVALID_EMAIL: "auth/invalid-email",
    INVALID_CRED: "auth/invalid-credential",
    WEAK_PASSWORD: "auth/weak-password",
    USER_NOT_FOUND: "auth/user-not-found",
    WRONG_PASSWORD: "auth/wrong-password",
    USER_EXISTS: "auth/email-already-in-use",
    UNKNOWN_ERROR: "auth/unknown-error"
} as const;

export type AuthErrorKey = keyof typeof AuthErrorMessages;

import { auth } from './firebase';

// fetch with the signed-in user's Firebase ID token attached.
// Use for all /api/* calls — but never for presigned S3 URLs, where an
// Authorization header would clash with the URL's signature.
export const authedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = await auth.currentUser?.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

import { auth } from './firebase';

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

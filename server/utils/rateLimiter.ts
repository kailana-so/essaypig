export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function sendAllWithRateLimit<T>(
  emails: T[],
  send: (email: T) => Promise<void>,
  rps = 2
): Promise<{ failed: Array<{ email: T; error: unknown }> }> {
  const interval = Math.ceil(1000 / rps); // e.g. 500ms for 2 rps
  const failed: Array<{ email: T; error: unknown }> = [];

  for (const email of emails) {
    try {
      await send(email);
    } catch (error) {

      console.log(error)
      failed.push({ email, error });
    }
    await sleep(interval);
  }
  return { failed };
}

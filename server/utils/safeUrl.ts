import dns from 'dns/promises';
import net from 'net';

// Guards the summariser's fetch of a user-supplied link against SSRF.

const isBlockedIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;                       // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true;          // private
    if (a === 127) return true;                       // loopback
    if (a === 169 && b === 254) return true;          // link-local / metadata
    if (a === 0) return true;                         // "this host"
    return false;
  }
  // Non-public IPv6: loopback, link-local, unique-local, IPv4-mapped.
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  if (lower.startsWith('::ffff:')) return isBlockedIp(lower.slice('::ffff:'.length));
  return false;
};

// Rejects the URL unless its host resolves to a public address.
export const assertPublicUrl = async (raw: string): Promise<void> => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Not a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) links are allowed');
  }

  // Strip the brackets URL keeps on an IPv6 host, then check literals directly.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error('Link points to a private address');
    return;
  }

  const results = await dns.lookup(host, { all: true });
  if (results.length === 0) throw new Error('Could not resolve host');
  for (const { address } of results) {
    if (isBlockedIp(address)) throw new Error('Link points to a private address');
  }
};

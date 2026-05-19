const net = require('net');

const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
]);

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  return normalized === '::1'
    || normalized.startsWith('fe80:')
    || normalized.startsWith('fc')
    || normalized.startsWith('fd');
}

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost');
}

function assertAllowedLLMUrl(urlString) {
  const parsed = new URL(urlString);
  const protocol = parsed.protocol;

  if (['file:', 'ftp:', 'data:', 'javascript:', 'gopher:'].includes(protocol)) {
    throw new Error(`Protocolo no permitido: ${protocol}`);
  }

  if (protocol !== 'https:' && protocol !== 'http:') {
    throw new Error(`Protocolo no permitido: ${protocol}`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new Error('Host bloqueado por política de seguridad.');
  }

  if (protocol === 'https:') {
    return;
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) return;
  if (ipVersion === 6 && isPrivateIPv6(hostname)) return;
  if (isLocalHostname(hostname)) return;

  throw new Error('HTTP solo está permitido hacia localhost o redes privadas (RFC1918). Use HTTPS para APIs públicas.');
}

module.exports = {
  assertAllowedLLMUrl,
  isPrivateIPv4,
};

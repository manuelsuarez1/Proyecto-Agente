const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_LLM_BODY_BYTES = 25 * 1024 * 1024;

function assertMaxBytes(content, limit, label) {
  const size = Buffer.byteLength(String(content ?? ''), 'utf8');
  if (size > limit) {
    throw new Error(`${label} supera el límite de ${Math.round(limit / 1024 / 1024)} MB.`);
  }
}

module.exports = {
  MAX_FILE_BYTES,
  MAX_LLM_BODY_BYTES,
  assertMaxBytes,
};

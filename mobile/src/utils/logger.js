const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const MIN_LEVEL = typeof __DEV__ !== 'undefined' && __DEV__ ? 0 : 1

export const sessionId = Math.random().toString(36).slice(2, 8).toUpperCase()
let _seq = 0

function emit(level, tag, msg, meta) {
  if (level < MIN_LEVEL) return
  const now = new Date().toISOString().slice(11, 23)
  const line = `[ODIN ${now} ${LEVEL_NAMES[level]}][${tag}] ${msg}`
  const fn = level >= 3 ? console.error : level >= 2 ? console.warn : console.log
  if (meta !== undefined) fn(line, meta)
  else fn(line)
}

export function genReqId() {
  return `${sessionId}-${String(++_seq).padStart(4, '0')}`
}

export function createLogger(tag) {
  return {
    debug: (msg, meta) => emit(0, tag, msg, meta),
    info:  (msg, meta) => emit(1, tag, msg, meta),
    warn:  (msg, meta) => emit(2, tag, msg, meta),
    error: (msg, meta) => emit(3, tag, msg, meta),
  }
}

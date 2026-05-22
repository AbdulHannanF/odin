import { createLogger, genReqId } from '../utils/logger'

const log = createLogger('API')

export async function apiFetch(axiosInstance, method, url, options = {}) {
  const reqId = genReqId()
  const t0 = Date.now()
  log.info(`→ ${method.toUpperCase()} ${url}`, { reqId, data: options.data })
  try {
    const res = method === 'post'
      ? await axiosInstance.post(url, options.data)
      : await axiosInstance.get(url)
    log.info(`← ${method.toUpperCase()} ${url} [${res.status}] +${Date.now() - t0}ms`, { reqId })
    return res
  } catch (err) {
    const status = err?.response?.status
    log.error(`✗ ${method.toUpperCase()} ${url} [${status ?? 'ERR'}] +${Date.now() - t0}ms — ${err?.message}`, { reqId, status })
    throw err
  }
}

export async function apiFetch(axiosInstance, method, url, options = {}) {
  const res = method === 'post'
    ? await axiosInstance.post(url, options.data)
    : await axiosInstance.get(url)
  return res
}

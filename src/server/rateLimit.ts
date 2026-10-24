export const createRateLimiter = (limit = 20, windowMs = 10 * 60 * 1000) => {
  const requests = new Map<string, number[]>()
  return (ip: string) => {
    const now = Date.now()
    const active = (requests.get(ip) ?? []).filter(timestamp => now - timestamp < windowMs)
    if (active.length >= limit) {
      requests.set(ip, active)
      return false
    }
    active.push(now)
    requests.set(ip, active)
    return true
  }
}

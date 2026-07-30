// Best-effort in-memory rate limiter for serverless functions. Bounds this
// only within a single warm function instance — Vercel can spin up multiple
// instances under load and each gets its own Map, so this is a cost/abuse
// *speed bump*, not a hard guarantee. If usage grows enough that this stops
// being sufficient, swap in a shared store (e.g. Upstash Redis) — deliberately
// not done for MVP to stay on Vercel's free tier with zero extra infra.

const buckets = new Map()

export function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count }
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

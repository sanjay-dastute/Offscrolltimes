// Node coerces every property assigned to its native process.env object to a
// string. These Worker tests intentionally place a D1 binding there to mirror
// Cloudflare's runtime binding surface, so use a plain per-worker object.
process.env = { ...process.env }

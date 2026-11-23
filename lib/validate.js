'use strict';

function clean(v, max = 500) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) v = v.join(', ');
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const phoneOk = (p) => p.replace(/\D/g, '').length >= 10;

// Tiny in-memory rate limiter: max N submissions per IP per window.
const hits = new Map();
function rateLimit(max = 6, windowMs = 10 * 60 * 1000) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: 'Too many requests. Please call or message us instead.' });
    list.push(now);
    hits.set(key, list);
    next();
  };
}

module.exports = { clean, emailOk, phoneOk, rateLimit };

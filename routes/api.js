'use strict';
const express = require('express');
const db = require('../lib/db');
const { notify } = require('../lib/mailer');
const { clean, emailOk, phoneOk, rateLimit } = require('../lib/validate');

const router = express.Router();

router.post('/booking', rateLimit(), async (req, res) => {
  const b = req.body || {};
  if (clean(b.company)) return res.json({ ok: true }); // honeypot

  const data = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    email: clean(b.email, 160),
    artist: clean(b.artist, 80) || 'First available',
    services: clean(b.services, 600),
    client_type: clean(b.client_type, 40),
    preferred_days: clean(b.preferred_days, 200),
    preferred_time: clean(b.preferred_time, 60),
    notes: clean(b.notes, 2000),
    contact_pref: clean(b.contact_pref, 40),
    source: clean(b.source, 120)
  };

  if (!data.name) return res.status(400).json({ error: 'Please add your name.' });
  if (!data.phone && !data.email) return res.status(400).json({ error: 'Please add a phone number or email so we can reach you.' });
  if (data.email && !emailOk(data.email)) return res.status(400).json({ error: 'That email address doesn’t look right.' });
  if (data.phone && !phoneOk(data.phone)) return res.status(400).json({ error: 'Please double-check your phone number.' });
  if (!data.services) return res.status(400).json({ error: 'Pick at least one service you’re interested in.' });

  const info = db.prepare(`INSERT INTO bookings (name, phone, email, artist, services, client_type, preferred_days, preferred_time, notes, contact_pref, source)
    VALUES (@name, @phone, @email, @artist, @services, @client_type, @preferred_days, @preferred_time, @notes, @contact_pref, @source)`).run(data);

  notify(`New booking request: ${data.name} (${data.artist})`, [
    `Name: ${data.name}`,
    data.phone && `Phone: ${data.phone}`,
    data.email && `Email: ${data.email}`,
    `Artist: ${data.artist}`,
    `Services: ${data.services}`,
    data.client_type && `Client: ${data.client_type}`,
    data.preferred_days && `Days: ${data.preferred_days}`,
    data.preferred_time && `Time: ${data.preferred_time}`,
    data.contact_pref && `Best way to reach: ${data.contact_pref}`,
    data.notes && `Notes: ${data.notes}`
  ]);

  res.json({ ok: true, id: info.lastInsertRowid });
});

router.post('/apply', rateLimit(4), async (req, res) => {
  const b = req.body || {};
  if (clean(b.company)) return res.json({ ok: true }); // honeypot

  const data = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    email: clean(b.email, 160),
    specialty: clean(b.specialty, 200),
    years: clean(b.years, 40),
    licensed: clean(b.licensed, 40),
    instagram: clean(b.instagram, 120),
    message: clean(b.message, 2000)
  };

  if (!data.name) return res.status(400).json({ error: 'Please add your name.' });
  if (!data.phone && !data.email) return res.status(400).json({ error: 'Please add a phone number or email.' });
  if (data.email && !emailOk(data.email)) return res.status(400).json({ error: 'That email address doesn’t look right.' });

  const info = db.prepare(`INSERT INTO applications (name, phone, email, specialty, years, licensed, instagram, message)
    VALUES (@name, @phone, @email, @specialty, @years, @licensed, @instagram, @message)`).run(data);

  notify(`New "Join Our Team" inquiry: ${data.name}`, [
    `Name: ${data.name}`, data.phone && `Phone: ${data.phone}`, data.email && `Email: ${data.email}`,
    data.specialty && `Specialty: ${data.specialty}`, data.years && `Experience: ${data.years}`,
    data.licensed && `Licensed: ${data.licensed}`, data.instagram && `Instagram: ${data.instagram}`,
    data.message && `Message: ${data.message}`
  ]);

  res.json({ ok: true, id: info.lastInsertRowid });
});

module.exports = router;

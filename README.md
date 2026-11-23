# Meraki Studio — Windham, ME

Website for Meraki Studio (hair, lash, brow & skin collective). Built by [Real Easy Sites](https://getrealeasysites.com).

## Stack
Node 20 + Express + SQLite (better-sqlite3). Static front end in `public/`, admin dashboard in `admin/` (only served after login).

```
server.js        thin entry point
routes/api.js    public form endpoints (booking inquiry, join-our-team)
routes/admin.js  password-only admin login + dashboard API (status, notes, delete)
lib/             db, auth, mailer, validation
public/          the website
admin/           dashboard (never served to signed-out visitors)
db/              SQLite file lives here (gitignored)
```

## Run locally
```
npm install
ADMIN_PASSWORD=choose-one npm start
```
Site: http://localhost:3000 · Dashboard: http://localhost:3000/admin

## Environment variables (Render)
| Var | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Dashboard password (login is disabled until set, min 6 chars) |
| `SESSION_SECRET` | recommended | Any long random string; keeps sign-ins valid across restarts |
| `DB_PATH` | recommended | Point at a persistent disk, e.g. `/var/data/meraki.sqlite` |
| `NOTIFY_EMAIL` | optional | Where new-request alerts go |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | optional | Needed for email alerts (e.g. Gmail + app password: smtp.gmail.com / 465) |

## Dashboard
- Password-only login
- Booking requests + Join-the-team inquiries in separate tabs
- Filter by status (New / Contacted / Booked / Closed), by artist, or search
- Private notes on every request
- Every request can be deleted (with confirm) to clear spam/test entries

# Security policy

Mee runs a public website and a Telegram bot, so security reports matter to us.

## Supported versions

Only the live service (`main` branch, deployed at https://meefire.app) gets security fixes.

## Report a vulnerability

**Please don't open a public issue.** Report privately through GitHub:

1. Go to https://github.com/thesithunyein/mee/security/advisories/new
2. Describe the problem, how to reproduce it, and what an attacker could do.

You'll get a first reply within 3 days. Once a fix is live, we'll credit you in the release notes unless you'd rather stay anonymous.

## In scope

- The website and its API routes (`/api/telegram`, `/api/telegram/setup`, `/api/cron/alerts`)
- The Telegram bot `@mee_fire_bot`
- Anything in this repository, including the data pipeline

## Out of scope

- NASA FIRMS, Telegram, Vercel or Upstash themselves. Please report those to their owners.
- Denial-of-service by sending huge volumes of traffic
- Missing security headers with no real impact

## How Mee protects data

- Secrets are stored only in environment variables, never in the repository.
- The bot webhook checks Telegram's secret token on every request. The cron and setup routes require a secret key.
- The only personal data stored is a Telegram chat ID and the places that chat follows. `/stop` deletes it.

# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately rather than
opening a public issue.

- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  ("Report a vulnerability" under the **Security** tab), or
- email the maintainer.

Please include steps to reproduce, the affected version/commit, and the potential
impact. We will acknowledge your report and aim to respond with an assessment and
remediation plan as soon as possible.

## Scope

SpartanTournaments is a self-hosted, auth-bearing application. Security-relevant
areas include:

- Session handling (iron-session cookies) and the `SESSION_SECRET` requirement.
- Password storage (bcrypt hashing) for Admin and Referee roles.
- Authorization checks on API routes and role-gated views.
- Request validation (Zod) on server endpoints.

## Operator responsibilities

When self-hosting:

- Set a strong, unique `SESSION_SECRET` (≥ 32 characters); never reuse the
  `.env.example` placeholder or the local Docker credentials in production.
- Run behind HTTPS with `NODE_ENV=production` so session cookies are
  marked secure.
- Keep dependencies up to date.

# Security and privacy

## Report a vulnerability or exposure

Use GitHub's [private vulnerability reporting](https://github.com/WesleySabino/japanese-games/security/advisories/new)
for vulnerabilities, credentials, or personal information you find exposed.
Describe the affected file or commit and the impact with sensitive values redacted.
Do not put credentials, personal learning exports, or unredacted personal data in
a public issue or pull request.

Security fixes target the current `main` version. Browser/device details and a
minimal reproduction using synthetic data help with investigation.

## Public identifiers and private data

The public GitHub handle, repository URLs, production domain, and GA4 measurement
ID identify this open-source project. The measurement ID is a public browser
configuration value, not an Analytics administration credential.

Kana Rain stores learning progress in the player's browser. The authored
Analytics code loads only after consent on approved production HTTPS hosts and
filters events and fields. See the [privacy notice](01-kana-rain/privacy.html)
and [Analytics boundary tests](01-kana-rain/tests/analytics.test.mjs).

## Before sharing a change

- Keep credentials, personal exports, browser profiles, local account paths,
  private contact details, and test artifacts out of source and screenshots.
- Use synthetic fixtures and disposable browser profiles for tests.
- Inspect the staged diff and retain the explicit production build allowlist.
- Use your GitHub no-reply address if you want your email to stay private.

The secret-scanning workflow runs Gitleaks against reachable Git history, with
values redacted. Automated secret scanning does not establish that every form of
personal information is absent; review commit identities, prose, media metadata,
fixtures, and deployment output as well.

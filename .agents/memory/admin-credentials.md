---
name: Admin email typo in test runner
description: The automated test runner consistently misreads the admin email address
---

## Rule
Never use `[API]` login steps with the admin email in test plans. Always use browser-based login (`[Browser]` steps to /auth).

## Why
The test runner (Playwright subagent) consistently types `cameron@nearmarketinghub.com` instead of the correct `cameron@nearmemarketinghub.com` (missing "me"). This causes 401 errors when using API login steps.

## How to apply
In test plans, use browser login:
```
2. [Browser] Navigate to /auth
3. [Browser] Find the email input and type exactly: cameron@nearmemarketinghub.com
4. [Browser] Type password: Marketing.123
5. [Browser] Click the Sign In button
```
Even then, the agent may mistype. As a fallback, use `curl -b /tmp/cookies.txt` in bash for API verification rather than relying on browser auth in tests.

Admin password: Marketing.123 (not a secret, test-only)

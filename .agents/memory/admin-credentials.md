---
name: Test login reliability
description: Automated test runner has a known reliability issue with the admin email address
---

## Rule
Never use `[API]` login steps with email/password in test plans for this app. Always use browser-based `[Browser]` steps to /auth, and add a note warning the agent to type the email carefully.

## Why
The testing subagent has a recurring pattern of mistyping the admin email. Browser-based login with a careful prompt produces more reliable results than API login steps.

## How to apply
In test plans, prefer:
```
[Browser] Navigate to /auth
[Browser] Enter the email address carefully in the email input (type each character)
[Browser] Enter the password in the password input
[Browser] Click the Sign In button
```
If tests still fail on auth, use curl for API verification instead of relying solely on browser auth in the test runner.

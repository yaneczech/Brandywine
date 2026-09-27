# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report them privately through
[GitHub security advisories](https://github.com/yaneczech/Brandywine/security/advisories/new) ("Report a
vulnerability" on the repository's Security tab). Include what an attacker can
do, the steps to reproduce and the affected version or commit.

We acknowledge reports within 5 working days, keep you informed while we fix
the issue, and credit you in the release notes unless you prefer otherwise.

## Supported versions

Security fixes go into the latest release. Self-hosted installs update with:

```bash
./brandywine update
```

## Scope

In scope: the app (`app/`), the worker (`worker/`), the install CLI
(`brandywine`) and the Docker configuration in this repository. Out of scope:
issues that need a compromised server or administrator account, and findings
in third-party services a self-hosted install is configured to use.

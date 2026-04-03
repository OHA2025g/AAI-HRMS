# GitHub branch protection + required PR checks

Org-level settings may override repo settings. Typical setup for `main`:

1. **Settings → Branches → Branch protection rules → Add rule** for `main`.
2. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass** — select workflows that must be green, e.g.:
     - `Quality Gates` / `backend-unit`, `backend-mongo-migrations`, `frontend-build` (names match your workflow `job` ids)
   - **Require branches to be up to date** (recommended)
   - Optionally **Require review** from CODEOWNERS
3. Enable **Require linear history** if you squash-merge only.
4. Block force-push and deletion.

**Dependabot:** enable at org or repo (`.github/dependabot.yml` is in this repo). If blocked at org level, request an org admin exception.

**Note:** Do not paste PATs into the repo; use GitHub Actions `GITHUB_TOKEN` or OIDC.

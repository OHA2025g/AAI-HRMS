# DR / failover / restore drill evidence

Store **one folder per drill**, e.g. `2026-03-21-mongo-restore/`, containing:

- `summary.md` — scenario, participants, start/end time, outcome (pass/fail), gaps
- `commands.txt` or redacted CLI log
- Screenshots or export of backup job last successful run
- Link to ticket / postmortem (if any)

**Process (not automated here):** execute a real restore into an isolated cluster or namespace, verify application read/write, then document results. Cross-link playbooks from `deploy/README.md` if present.

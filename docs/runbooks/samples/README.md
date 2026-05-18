# Runbook samples (M0)

| File | Purpose |
|------|---------|
| `fluent-bit-aai-hrms.conf` | Fluent Bit input/output sketch for JSON API logs |
| `parsers-aai-hrms.conf` | JSON parser matching `LOG_FORMAT=json` log lines |
| `dr-drill-example-stub.md` | Example-filled DR drill log (not a real drill) |

Wire outputs (`[OUTPUT]`) to your org’s Loki, Elasticsearch, or cloud logging after internal review.

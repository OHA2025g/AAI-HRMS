"""M10 event backbone — Mongo collections and defaults."""

COL_M10_EVENTS = "m10_events"
COL_M10_IDEMPOTENCY = "m10_event_idempotency"
COL_M10_HANDLER_AUDIT = "m10_event_handler_audit"

DEFAULT_PRODUCER = "aai-hrms-monolith"
CONSUMER_NAME = "m10_default_consumer"
MAX_DELIVERY_ATTEMPTS = 5
POLL_INTERVAL_SEC = 2.0
CLAIM_BATCH_SIZE = 25

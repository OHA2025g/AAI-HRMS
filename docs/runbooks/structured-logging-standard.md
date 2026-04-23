# Structured logging standard (M0-3)

## When to use
Set **`LOG_FORMAT=json`** (or `structured`) in the API environment so log shippers can parse one JSON object per line.

## Required fields (JSON)
| Field | Type | Description |
|-------|------|-------------|
| `ts` | string | UTC timestamp (ISO-8601 with `Z`) |
| `service` | string | Logical service name; default **`aai-hrms-api`**, override with **`SERVICE_NAME`** |
| `request_id` | string | Correlation ID; from inbound **`X-Request-ID`** (or header name from **`REQUEST_ID_HEADER`**) or generated UUID |
| `level` | string | Log level (`INFO`, `ERROR`, …) |
| `logger` | string | Python logger name |
| `msg` | string | Human-readable message |

## Optional fields
| Field | When |
|-------|------|
| `exc` | Present when an exception was logged with stack trace |

## HTTP response
The same correlation ID is returned on the response header **`X-Request-ID`** (or **`REQUEST_ID_HEADER`**).

## Text format (default)
When `LOG_FORMAT` is not JSON, lines look like:
`timestamp - <service> - logger - LEVEL - [request_id] - message`

## References
- `backend/server.py` — `_configure_logging`, `observability_middleware`
- `docs/runbooks/samples/` — Fluent Bit parser (extend if you add fields)

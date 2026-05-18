# External secret stores (M0)

The backend loads `.env` first, then optionally merges secrets from **HashiCorp Vault** (KV v2) or **AWS Secrets Manager** before connecting to MongoDB.

## Configuration

| `SECRET_STORE` | Behavior |
|----------------|----------|
| `env` (default) | Only `.env` / process environment. |
| `vault` | Read KV v2 object and merge keys into `os.environ`. |
| `aws` | Read one JSON secret from AWS Secrets Manager. |

Implementation: `backend/secrets_loader.py` (called from `server.py` right after `load_dotenv`).

## Vault (KV v2)

Required:

- `VAULT_ADDR`
- Auth: **`VAULT_TOKEN`** *or* **`VAULT_ROLE_ID` + `VAULT_SECRET_ID`**

Optional:

- `VAULT_NAMESPACE` (Vault Enterprise)
- `VAULT_KV_MOUNT` (default `secret`)
- `VAULT_KV_PATH` (default `aai-hrms`) — data lives at `{mount}/data/{path}`

Store a JSON object whose keys match env vars you need, e.g. `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `EMERGENT_LLM_KEY`.

## AWS Secrets Manager

Required:

- `SECRET_STORE=aws`
- `AWS_SECRET_ID` — secret name or ARN
- Secret value: **JSON object** of string keys/values (same keys as env)

Optional:

- `AWS_REGION` / `AWS_DEFAULT_REGION`

Use IAM roles in AWS (ECS/EKS/Lambda/EC2 instance profile) instead of static keys when possible.

## Security notes

- Do not commit real tokens or secret JSON to git.
- Rotate Vault tokens / AppRole secret IDs on a schedule.
- Restrict Vault policy and AWS IAM to least privilege (read-only on one path/secret).

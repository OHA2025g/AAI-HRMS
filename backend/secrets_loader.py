"""
Optional external secret stores (M0).

Load order:
1. Caller should run `load_dotenv` first (see server.py).
2. `apply_secret_store()` merges secrets from Vault or AWS Secrets Manager when configured.

Environment:
  SECRET_STORE   — `env` (default, no-op), `vault`, `aws`

HashiCorp Vault (KV v2):
  VAULT_ADDR         — e.g. https://vault.example.com:8200
  VAULT_TOKEN        — dev / CI token auth (optional if using AppRole)
  VAULT_ROLE_ID      — AppRole (optional)
  VAULT_SECRET_ID    — AppRole (optional)
  VAULT_NAMESPACE    — enterprise namespace (optional)
  VAULT_KV_MOUNT     — default `secret`
  VAULT_KV_PATH      — logical path under mount, default `aai-hrms`
                       (reads KV v2 at {mount}/data/{path})

AWS Secrets Manager:
  AWS_SECRET_ID      — secret id or ARN (JSON object of KEY -> string value)
  AWS_REGION         — region for the client (optional; uses default chain)

Merge policy: keys from the secret store overwrite existing os.environ values
for those keys only (so Vault/SM is authoritative for provided fields).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)


def _merge_env(updates: Dict[str, Any], source: str) -> None:
    for key, raw in updates.items():
        if raw is None:
            continue
        val = raw if isinstance(raw, str) else json.dumps(raw)
        os.environ[str(key)] = val
    logger.info("Secret store %s merged %d keys into environment", source, len(updates))


def _load_vault() -> None:
    try:
        import hvac  # type: ignore
    except ImportError as e:
        raise RuntimeError("hvac is required for SECRET_STORE=vault. pip install hvac") from e

    addr = os.environ.get("VAULT_ADDR", "").strip()
    if not addr:
        raise RuntimeError("VAULT_ADDR is required when SECRET_STORE=vault")

    namespace = os.environ.get("VAULT_NAMESPACE", "").strip() or None
    client = hvac.Client(url=addr, namespace=namespace)

    role_id = os.environ.get("VAULT_ROLE_ID", "").strip()
    secret_id = os.environ.get("VAULT_SECRET_ID", "").strip()
    token = os.environ.get("VAULT_TOKEN", "").strip()

    if role_id and secret_id:
        client.auth.approle.login(role_id=role_id, secret_id=secret_id)
    elif token:
        client.token = token
    else:
        raise RuntimeError("Set VAULT_TOKEN or VAULT_ROLE_ID+VAULT_SECRET_ID for Vault auth")

    if not client.is_authenticated():
        raise RuntimeError("Vault authentication failed")

    mount = os.environ.get("VAULT_KV_MOUNT", "secret").strip() or "secret"
    path = os.environ.get("VAULT_KV_PATH", "aai-hrms").strip() or "aai-hrms"

    resp = client.secrets.kv.v2.read_secret_version(path=path, mount_point=mount)
    data = (resp or {}).get("data", {}).get("data") or {}
    if not isinstance(data, dict):
        raise RuntimeError("Vault KV data must be a JSON object at data.data")
    _merge_env(data, f"vault:{mount}/{path}")


def _load_aws_secrets_manager() -> None:
    try:
        import boto3  # type: ignore
    except ImportError as e:
        raise RuntimeError("boto3 is required for SECRET_STORE=aws") from e

    secret_id = os.environ.get("AWS_SECRET_ID", "").strip()
    if not secret_id:
        raise RuntimeError("AWS_SECRET_ID is required when SECRET_STORE=aws")

    region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "")).strip() or None
    client = boto3.client("secretsmanager", region_name=region)
    out = client.get_secret_value(SecretId=secret_id)
    payload = out.get("SecretString") or ""
    if not payload.strip():
        raise RuntimeError("AWS Secrets Manager SecretString is empty")

    data = json.loads(payload)
    if not isinstance(data, dict):
        raise RuntimeError("AWS secret JSON must be an object of string key/value pairs")
    _merge_env(data, f"aws:{secret_id}")


def apply_secret_store() -> None:
    """
    Merge external secrets into os.environ when SECRET_STORE requests it.
    Safe to call when SECRET_STORE is unset or `env` (no-op).
    """
    store = os.environ.get("SECRET_STORE", "env").strip().lower()
    if not store or store in ("env", "none", "off", "false", "0"):
        return
    if store == "vault":
        _load_vault()
        return
    if store in ("aws", "aws_secretsmanager", "secretsmanager"):
        _load_aws_secrets_manager()
        return
    raise RuntimeError(f"Unsupported SECRET_STORE={store!r} (use env, vault, or aws)")

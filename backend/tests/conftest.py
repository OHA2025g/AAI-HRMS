"""Pytest defaults so `import server` works without a local .env."""

import os

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pytest_aai_hrms")
os.environ.setdefault("JWT_SECRET", "pytest_jwt_secret")

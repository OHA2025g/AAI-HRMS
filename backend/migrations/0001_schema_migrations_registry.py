"""
Registry index for applied migrations (_schema_migrations).
"""


async def up(db) -> None:
    await db["_schema_migrations"].create_index(
        "id",
        unique=True,
        name="uq_schema_migrations_id",
    )

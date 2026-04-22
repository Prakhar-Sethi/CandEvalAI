from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# SQLite for local dev (no PostgreSQL needed), asyncpg for production/Docker
_url = settings.database_url
if _url.startswith("postgresql+asyncpg"):
    # Fall back to SQLite if postgres isn't available locally
    import os
    _url = "sqlite+aiosqlite:///./hcl_module3.db"

engine = create_async_engine(
    _url,
    echo=settings.debug,
    connect_args={"check_same_thread": False} if "sqlite" in _url else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

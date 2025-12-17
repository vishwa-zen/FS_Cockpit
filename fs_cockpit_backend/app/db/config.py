"""Database configuration settings."""

import os


class DatabaseConfig:
    """PostgreSQL database configuration."""

    def __init__(self):
        self.username: str = os.getenv("DB_USERNAME", "zenpocadmin")
        self.password: str = os.getenv("DB_PASSWORD", "zPxt4wR30jCP")
        self.host: str = os.getenv("DB_HOST", "zenpoc-postgresdb.postgres.database.azure.com")
        self.port: int = int(os.getenv("DB_PORT", "5432"))
        self.database: str = os.getenv("DB_NAME", "fs_cockpit")
        self.ssl_mode: str = os.getenv("DB_SSL_MODE", "require")
        self.pool_size: int = int(os.getenv("DB_POOL_SIZE", "20"))
        self.max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "40"))
        self.pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))
        self.echo_sql: bool = os.getenv("DB_ECHO_SQL", "false").lower() == "true"

    @property
    def database_url(self) -> str:
        """Build PostgreSQL connection URL."""
        return (
            f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
            f"?sslmode={self.ssl_mode}"
        )

    def get_connection_string(self) -> str:
        """Get safe connection string (without password for logging)."""
        return f"postgresql://{self.username}:***@{self.host}:{self.port}/{self.database}"


# Global config instance
db_config = DatabaseConfig()

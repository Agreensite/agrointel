from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/agrointel"

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # CORS
    ALLOWED_ORIGINS: List[str] = ["[localhost](http://localhost:5173)", "[agrointel.vercel.app](https://agrointel.vercel.app)"]

    # NASA POWER API
    NASA_POWER_BASE_URL: str = "[power.larc.nasa.gov](https://power.larc.nasa.gov/api/temporal/daily/point)"

    # SoilGrids
    SOILGRIDS_BASE_URL: str = "[rest.isric.org](https://rest.isric.org/soilgrids/v2.0)"

    # Open-Meteo
    OPEN_METEO_URL: str = "[api.open-meteo.com](https://api.open-meteo.com/v1/forecast)"

    # Copernicus / Element84 STAC (публичный, без ключа)
    STAC_URL: str = "[earth-search.aws.element84.com](https://earth-search.aws.element84.com/v1)"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # OpenAI (опционально — для LLM-советов)
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()

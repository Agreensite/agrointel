from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)

    # Почва
    soil_ph = Column(Float, nullable=True)
    soil_organic_carbon = Column(Float, nullable=True)
    soil_nitrogen = Column(Float, nullable=True)
    soil_texture = Column(String, nullable=True)

    # Погода (последние 30 дней)
    avg_temperature = Column(Float, nullable=True)
    total_precipitation = Column(Float, nullable=True)
    avg_solar_radiation = Column(Float, nullable=True)

    # NDVI
    ndvi_current = Column(Float, nullable=True)
    ndvi_trend = Column(String, nullable=True)  # "improving" | "stable" | "declining"

    # AI выводы
    yield_forecast_kg_ha = Column(Float, nullable=True)
    recommendations = Column(JSON, nullable=True)  # список строк
    fertilizer_plan = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    field = relationship("Field", back_populates="analyses")

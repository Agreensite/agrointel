from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # GeoJSON geometry хранится как JSON
    geometry = Column(JSON, nullable=False)

    # Центроид для запросов к API
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    area_ha = Column(Float, nullable=True)  # площадь в гектарах

    crop_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="fields")
    analyses = relationship("Analysis", back_populates="field", cascade="all, delete-orphan")

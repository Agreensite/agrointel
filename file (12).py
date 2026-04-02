from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
import math

from app.database import get_db
from app.models.field import Field
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter()


class FieldCreate(BaseModel):
    name: str
    geometry: Dict[str, Any]   # GeoJSON Polygon/MultiPolygon
    crop_type: Optional[str] = "wheat"


class FieldResponse(BaseModel):
    id: int
    name: str
    geometry: Dict[str, Any]
    center_lat: float
    center_lon: float
    area_ha: Optional[float]
    crop_type: Optional[str]

    class Config:
        from_attributes = True


def compute_centroid(geometry: Dict[str, Any]):
    """Вычисляет центроид GeoJSON Polygon."""
    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return 0.0, 0.0
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    return sum(lats) / len(lats), sum(lons) / len(lons)


def compute_area_ha(geometry: Dict[str, Any]) -> float:
    """Приближённая площадь полигона через формулу Гаусса (сферическая Земля)."""
    coords = geometry.get("coordinates", [[]])[0]
    if len(coords) < 3:
        return 0.0
    R = 6371000  # радиус Земли, метры
    n = len(coords)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        lat1, lon1 = math.radians(coords[i][1]), math.radians(coords[i][0])
        lat2, lon2 = math.radians(coords[j][1]), math.radians(coords[j][0])
        area += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
    area = abs(area) * R * R / 2
    return round(area / 10000, 2)  # м² → га


@router.get("/", response_model=List[FieldResponse])
async def list_fields(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Field).where(Field.owner_id == current_user.id))
    return result.scalars().all()


@router.post("/", response_model=FieldResponse, status_code=201)
async def create_field(
    body: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lat, lon = compute_centroid(body.geometry)
    area = compute_area_ha(body.geometry)

    field = Field(
        name=body.name,
        owner_id=current_user.id,
        geometry=body.geometry,
        center_lat=lat,
        center_lon=lon,
        area_ha=area,
        crop_type=body.crop_type,
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=204)
async def delete_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.owner_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    await db.delete(field)
    await db.commit()

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.field import Field
from app.models.analysis import Analysis
from app.models.user import User
from app.utils.auth import get_current_user
from app.services.nasa_service import fetch_nasa_weather
from app.services.soil_service import fetch_soil_data
from app.services.ndvi_service import fetch_ndvi
from app.services.ai_service import generate_recommendations

router = APIRouter()


async def run_analysis(field_id: int, db: AsyncSession):
    result = await db.execute(select(Field).where(Field.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        return

    lat, lon = field.center_lat, field.center_lon

    # Параллельный сбор данных
    import asyncio
    weather, soil, ndvi = await asyncio.gather(
        fetch_nasa_weather(lat, lon),
        fetch_soil_data(lat, lon),
        fetch_ndvi(lat, lon),
    )

    ai_result = generate_recommendations(
        soil=soil,
        weather=weather,
        ndvi=ndvi,
        crop_type=field.crop_type or "wheat",
    )

    analysis = Analysis(
        field_id=field_id,
        soil_ph=soil.get("soil_ph"),
        soil_organic_carbon=soil.get("soil_organic_carbon"),
        soil_nitrogen=soil.get("soil_nitrogen"),
        soil_texture=soil.get("soil_texture"),
        avg_temperature=weather.get("avg_temperature"),
        total_precipitation=weather.get("total_precipitation"),
        avg_solar_radiation=weather.get("avg_solar_radiation"),
        ndvi_current=ndvi.get("ndvi_current"),
        ndvi_trend=ndvi.get("ndvi_trend"),
        yield_forecast_kg_ha=ai_result["yield_forecast_kg_ha"],
        recommendations=ai_result["recommendations"],
        fertilizer_plan=ai_result["fertilizer_plan"],
    )
    db.add(analysis)
    await db.commit()


@router.post("/{field_id}/run", status_code=202)
async def trigger_analysis(
    field_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.owner_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Field not found")

    background_tasks.add_task(run_analysis, field_id, db)
    return {"message": "Analysis started", "field_id": field_id}


@router.get("/{field_id}/latest")
async def get_latest_analysis(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Проверка владельца
    field_res = await db.execute(
        select(Field).where(Field.id == field_id, Field.owner_id == current_user.id)
    )
    if not field_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Field not found")

    result = await db.execute(
        select(Analysis)
        .where(Analysis.field_id == field_id)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found. Run analysis first.")

    return analysis

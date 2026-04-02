import httpx
from typing import Dict, Any
from app.config import settings


async def fetch_soil_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Получает данные почвы из SoilGrids v2 (ISRIC).
    Публичный API — ключ не нужен.
    """
    params = {
        "lon": lon,
        "lat": lat,
        "property": ["phh2o", "soc", "nitrogen", "clay", "sand"],
        "depth": "0-30cm",
        "value": "mean",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.SOILGRIDS_BASE_URL}/properties/query",
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    props = {}
    for layer in data.get("properties", {}).get("layers", []):
        name = layer["name"]
        depths = layer.get("depths", [])
        if depths:
            val = depths[0].get("values", {}).get("mean")
            props[name] = val

    # SoilGrids возвращает pH * 10
    ph_raw = props.get("phh2o")
    clay = props.get("clay")
    sand = props.get("sand")

    texture = "unknown"
    if clay is not None and sand is not None:
        clay_pct = clay / 10  # g/kg → %
        sand_pct = sand / 10
        if clay_pct > 40:
            texture = "clay"
        elif sand_pct > 70:
            texture = "sandy"
        elif clay_pct < 20 and sand_pct < 60:
            texture = "loam"
        else:
            texture = "silt-loam"

    return {
        "soil_ph": round(ph_raw / 10, 2) if ph_raw else None,
        "soil_organic_carbon": props.get("soc"),
        "soil_nitrogen": props.get("nitrogen"),
        "soil_texture": texture,
    }

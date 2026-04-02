import httpx
from datetime import date, timedelta
from typing import Dict, Any
from app.config import settings


async def fetch_nasa_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Получает данные NASA POWER: температура, осадки, радиация
    за последние 30 дней. Публичный API — ключ не нужен.
    """
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=30)

    params = {
        "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(settings.NASA_POWER_BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("properties", {}).get("parameter", {})

    t2m_values = list(properties.get("T2M", {}).values())
    precip_values = list(properties.get("PRECTOTCORR", {}).values())
    solar_values = list(properties.get("ALLSKY_SFC_SW_DWN", {}).values())

    return {
        "avg_temperature": round(sum(t2m_values) / len(t2m_values), 2) if t2m_values else None,
        "total_precipitation": round(sum(precip_values), 2) if precip_values else None,
        "avg_solar_radiation": round(sum(solar_values) / len(solar_values), 2) if solar_values else None,
        "period_days": 30,
    }

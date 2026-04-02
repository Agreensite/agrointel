from typing import Dict, Any, List


CROP_PROFILES = {
    "wheat": {"optimal_ph": (6.0, 7.0), "min_precip_mm": 300, "base_yield_kg_ha": 3500},
    "corn": {"optimal_ph": (5.8, 7.0), "min_precip_mm": 500, "base_yield_kg_ha": 5000},
    "sunflower": {"optimal_ph": (6.0, 7.5), "min_precip_mm": 350, "base_yield_kg_ha": 2000},
    "soybean": {"optimal_ph": (6.0, 6.8), "min_precip_mm": 450, "base_yield_kg_ha": 2500},
    "potato": {"optimal_ph": (5.0, 6.5), "min_precip_mm": 400, "base_yield_kg_ha": 20000},
}


def generate_recommendations(
    soil: Dict[str, Any],
    weather: Dict[str, Any],
    ndvi: Dict[str, Any],
    crop_type: str = "wheat",
) -> Dict[str, Any]:
    profile = CROP_PROFILES.get(crop_type, CROP_PROFILES["wheat"])
    recommendations: List[str] = []
    fertilizer_plan: Dict[str, Any] = {}

    ph = soil.get("soil_ph") or 6.5
    soc = soil.get("soil_organic_carbon") or 10
    nitrogen = soil.get("soil_nitrogen") or 1.0
    texture = soil.get("soil_texture", "loam")
    precip = weather.get("total_precipitation") or 0
    avg_temp = weather.get("avg_temperature") or 15
    ndvi_val = ndvi.get("ndvi_current") or 0.5

    # --- pH рекомендации ---
    ph_min, ph_max = profile["optimal_ph"]
    if ph < ph_min:
        recommendations.append(
            f"pH почвы ({ph}) ниже оптимума для {crop_type}. "
            f"Внесите известь — 2–4 т/га, чтобы поднять pH до {ph_min}–{ph_max}."
        )
    elif ph > ph_max:
        recommendations.append(
            f"pH почвы ({ph}) выше оптимума. "
            "Внесите серу (элементарную) или сульфат аммония для снижения pH."
        )
    else:
        recommendations.append(f"pH почвы ({ph}) находится в оптимальном диапазоне для {crop_type}.")

    # --- Азотные удобрения ---
    n_dose = 0
    if nitrogen < 1.5:
        n_dose = 120
        recommendations.append(
            f"Дефицит азота (N={nitrogen} г/кг). "
            f"Рекомендуется внесение {n_dose} кг/га КАС-32 или карбамида."
        )
    elif nitrogen < 2.5:
        n_dose = 80
        recommendations.append(f"Умеренный уровень азота. Внесите {n_dose} кг/га азота.")
    else:
        n_dose = 40
        recommendations.append("Азот в норме. Поддерживающая подкормка 40 кг/га.")

    # --- Органика / SOC ---
    if soc < 15:
        recommendations.append(
            "Низкое содержание органического углерода. "
            "Рекомендуется внесение компоста (10–15 т/га) или пожнивных остатков."
        )

    # --- Влага ---
    if precip < profile["min_precip_mm"] * 0.5:
        recommendations.append(
            f"Критически низкие осадки ({precip} мм за 30 дней). "
            "Требуется полив — нормой 30–40 мм. Рассмотрите капельное орошение."
        )
    elif precip < profile["min_precip_mm"] * 0.8:
        recommendations.append(
            f"Осадки ({precip} мм) ниже нормы. Контролируйте влажность почвы."
        )

    # --- NDVI ---
    if ndvi_val < 0.35:
        recommendations.append(
            f"NDVI = {ndvi_val} — вегетация угнетена. "
            "Проверьте наличие болезней, вредителей или стресса от засухи."
        )
    elif ndvi_val > 0.65:
        recommendations.append(f"NDVI = {ndvi_val} — посевы в отличном состоянии.")

    # --- Прогноз урожая ---
    base_yield = profile["base_yield_kg_ha"]
    yield_factor = 1.0
    yield_factor *= min(1.0, ndvi_val / 0.6)
    yield_factor *= min(1.0, precip / profile["min_precip_mm"])
    if not (ph_min <= ph <= ph_max):
        yield_factor *= 0.85
    if avg_temp < 5 or avg_temp > 35:
        yield_factor *= 0.7

    yield_forecast = round(base_yield * yield_factor)

    # --- Удобрения ---
    fertilizer_plan = {
        "nitrogen_kg_ha": n_dose,
        "phosphorus_kg_ha": 40 if soc < 20 else 20,
        "potassium_kg_ha": 60 if texture == "sandy" else 40,
        "timing": [
            {"stage": "Предпосевная", "share_pct": 40},
            {"stage": "Кущение/всходы", "share_pct": 35},
            {"stage": "Выход в трубку / цветение", "share_pct": 25},
        ],
    }

    return {
        "yield_forecast_kg_ha": yield_forecast,
        "recommendations": recommendations,
        "fertilizer_plan": fertilizer_plan,
    }

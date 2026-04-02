import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "../../store";
import { apiClient } from "../../api/client";
import toast from "react-hot-toast";

// Импорт draw-контролов (упрощённый вариант без пакета)
interface DrawMode {
  type: "Polygon";
  coordinates: number[][][];
}

export default function FieldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fields, addField, selectField } = useStore();

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "[basemaps.cartocdn.com](https://basemaps.cartocdn.com/gl/positron-gl-style/style.json)",
      center: [37.6, 55.75],
      zoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: false }),
      "top-right"
    );

    map.current.on("load", () => {
      // Слой полей
      map.current!.addSource("fields", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.current!.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.3,
        },
      });

      map.current!.addLayer({
        id: "fields-outline",
        type: "line",
        source: "fields",
        paint: {
          "line-color": "#16a34a",
          "line-width": 2,
        },
      });

      // Клик по полю — выбираем его
      map.current!.on("click", "fields-fill", (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          selectField(feature.properties.id);
          toast(`Выбрано поле: ${feature.properties.name}`, { icon: "🌾" });
        }
      });

      map.current!.on("mouseenter", "fields-fill", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "fields-fill", () => {
        map.current!.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Обновляем слой при изменении полей
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource("fields") as maplibregl.GeoJSONSource;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: fields.map((f) => ({
        type: "Feature",
        id: f.id,
        properties: { id: f.id, name: f.name, crop_type: f.crop_type },
        geometry: f.geometry as GeoJSON.Geometry,
      })),
    });
  }, [fields]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm text-gray-600">
        <p className="font-medium text-green-700 mb-1">🗺 Карта полей</p>
        <p>{fields.length} участков зарегистрировано</p>
      </div>
    </div>
  );
}

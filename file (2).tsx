import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Leaf, Droplets, Thermometer, TrendingUp, Zap, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../api/client";
import { useStore } from "../store";
import FieldMap from "../components/Map/FieldMap";

interface Analysis {
  soil_ph: number | null;
  soil_organic_carbon: number | null;
  soil_texture: string | null;
  avg_temperature: number | null;
  total_precipitation: number | null;
  ndvi_current: number | null;
  ndvi_trend: string | null;
  yield_forecast_kg_ha: number | null;
  recommendations: string[];
  fertilizer_plan: {
    nitrogen_kg_ha: number;
    phosphorus_kg_ha: number;
    potassium_kg_ha: number;
    timing: { stage: string; share_pct: number }[];
  } | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, fields, selectedFieldId, setFields, logout } = useStore();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadFields();
  }, [user]);

  useEffect(() => {
    if (selectedFieldId) loadAnalysis(selectedFieldId);
    else setAnalysis(null);
  }, [selectedFieldId]);

  const loadFields = async () => {
    try {
      const res = await apiClient.get("/api/fields/");
      setFields(res.data);
    } catch {
      toast.error("Не удалось загрузить поля");
    }
  };

  const loadAnalysis = async (fieldId: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/analysis/${fieldId}/latest`);
      setAnalysis(res.data);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedFieldId) return;
    setAnalysisRunning(true);
    try {
      await apiClient.post(`/api/analysis/${selectedFieldId}/run`);
      toast.success("Анализ запущен — данные появятся через ~15 сек");
      setTimeout(() => loadAnalysis(selectedFieldId), 15000);
    } catch {
      toast.error("Ошибка запуска анализа");
    } finally {
      setAnalysisRunning(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const fertilizerData = analysis?.fertilizer_plan
    ? [
        { name: "N (азот)", value: analysis.fertilizer_plan.nitrogen_kg_ha, color: "#22c55e" },
        { name: "P (фосфор)", value: analysis.fertilizer_plan.phosphorus_kg_ha, color: "#f59e0b" },
        { name: "K (калий)", value: analysis.fertilizer_plan.potassium_kg_ha, color: "#3b82f6" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌾</span>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">AgroIntel</h1>
            <p className="text-xs text-gray-500">Агроаналитика</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">{user?.full_name}</span>
          <button
            onClick={() => { logout(); navigate("/auth"); }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель */}
        <aside className="w-full md:w-72 lg:w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Список полей */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Мои поля</h2>
              <button
                onClick={() => navigate("/map")}
                className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
              >
                + Добавить
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Нет зарегистрированных полей
              </p>
            ) : (
              <ul className="space-y-2">
                {fields.map((f) => (
                  <li
                    key={f.id}
                    onClick={() => useStore.getState().selectField(f.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      f.id === selectedFieldId
                        ? "border-green-500 bg-green-50"
                        : "border-transparent bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-800">{f.name}</span>
                      <span className="text-xs text-gray-400">{f.area_ha} га</span>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{f.crop_type || "культура не указана"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Данные выбранного поля */}
          {selectedField && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{selectedField.name}</h3>
                <button
                  onClick={runAnalysis}
                  disabled={analysisRunning}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                  <Zap size={12} />
                  {analysisRunning ? "Запуск..." : "Анализ"}
                </button>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {analysis && !loading && (
                <>
                  {/* Метрики */}
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      icon={<Leaf size={14} />}
                      label="NDVI"
                      value={analysis.ndvi_current?.toFixed(2) ?? "—"}
                      color="green"
                    />
                    <MetricCard
                      icon={<Thermometer size={14} />}
                      label="Темп, °C"
                      value={analysis.avg_temperature?.toFixed(1) ?? "—"}
                      color="orange"
                    />
                    <MetricCard
                      icon={<Droplets size={14} />}
                      label="Осадки, мм"
                      value={analysis.total_precipitation?.toFixed(0) ?? "—"}
                      color="blue"
                    />
                    <MetricCard
                      icon={<TrendingUp size={14} />}
                      label="Прогноз, кг/га"
                      value={analysis.yield_forecast_kg_ha?.toLocaleString() ?? "—"}
                      color="purple"
                    />
                  </div>

                  {/* Почва */}
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1">🪨 Почва</p>
                    <p className="text-xs text-amber-700">pH: {analysis.soil_ph ?? "—"}</p>
                    <p className="text-xs text-amber-700">
                      Органика: {analysis.soil_organic_carbon ?? "—"} г/кг
                    </p>
                    <p className="text-xs text-amber-700 capitalize">
                      Текстура: {analysis.soil_texture ?? "—"}
                    </p>
                  </div>
                </>
              )}

              {!analysis && !loading && (
                <p className="text-xs text-gray-400 text-center">
                  Нажмите «Анализ» для получения данных
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Основной контент */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Карта */}
          <div className="h-64 md:h-80 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <FieldMap />
          </div>

          {/* Рекомендации и удобрения */}
          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              {/* Рекомендации */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>💡</span> Рекомендации
                </h3>
                <ul className="space-y-2">
                  {analysis.recommendations?.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* График удобрений */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🧪</span> План удобрений (кг/га)
                </h3>
                {fertilizerData.length > 0 && (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={fertilizerData} barSize={36}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {fertilizerData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* Сроки внесения */}
                {analysis.fertilizer_plan?.timing && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-gray-600">Сроки внесения:</p>
                    {analysis.fertilizer_plan.timing.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <div
                          className="h-1.5 rounded-full bg-green-500"
                          style={{ width: `${t.share_pct}%` }}
                        />
                        <span>{t.stage} — {t.share_pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Заглушка без поля */}
          {!selectedFieldId && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">🌱</div>
                <p className="text-gray-500 font-medium">Выберите поле на карте или в списке</p>
                <p className="text-gray-400 text-sm mt-1">
                  Затем запустите анализ для получения рекомендаций
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "green" | "orange" | "blue" | "purple";
}) {
  const colors = {
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className={`${colors[color]} rounded-lg p-2.5`}>
      <div className="flex items-center gap-1 mb-1 opacity-70">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { apiClient } from "../api/client";
import { useStore } from "../store";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, "Введите имя"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      let res;
      if (mode === "login") {
        const params = new URLSearchParams({
          username: data.email,
          password: data.password,
        });
        res = await apiClient.post("/api/auth/login", params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } else {
        res = await apiClient.post("/api/auth/register", data);
      }
      setAuth(
        { id: res.data.user_id, email: res.data.email, full_name: res.data.full_name },
        res.data.access_token
      );
      toast.success("Добро пожаловать!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка авторизации");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <span className="text-3xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AgroIntel</h1>
          <p className="text-gray-500 text-sm mt-1">Умное земледелие на основе данных</p>
        </div>

        {/* Переключатель */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === m
                  ? "bg-white text-green-700 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "login" ? "Войти" : "Регистрация"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Полное имя
              </label>
              <input
                {...register("full_name")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Иван Петров"
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="farmer@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              {...register("password")}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}

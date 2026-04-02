import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "[localhost](http://localhost:8000)";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Автоматически добавляем JWT-токен
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Перехватываем 401 — разлогиниваем
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth";
    }
    return Promise.reject(err);
  }
);

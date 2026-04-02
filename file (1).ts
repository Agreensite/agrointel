import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface Field {
  id: number;
  name: string;
  geometry: GeoJSON.Geometry;
  center_lat: number;
  center_lon: number;
  area_ha: number | null;
  crop_type: string | null;
}

interface AppState {
  user: User | null;
  token: string | null;
  fields: Field[];
  selectedFieldId: number | null;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setFields: (fields: Field[]) => void;
  addField: (field: Field) => void;
  removeField: (id: number) => void;
  selectField: (id: number | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      fields: [],
      selectedFieldId: null,

      setAuth: (user, token) => {
        localStorage.setItem("access_token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null, fields: [], selectedFieldId: null });
      },
      setFields: (fields) => set({ fields }),
      addField: (field) => set((s) => ({ fields: [...s.fields, field] })),
      removeField: (id) =>
        set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),
      selectField: (id) => set({ selectedFieldId: id }),
    }),
    {
      name: "agrointel-storage",
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

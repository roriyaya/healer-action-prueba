// 🔗 FUENTE ÚNICA DE LA URL DEL BACKEND: reemplaza los ~50 "http://localhost:3001" que
// estaban repetidos y sueltos por todo el frontend.
// 🩹 BUG REAL CONFIRMADO (2026-08-01): esto antes leía VITE_API_URL (una IP de LAN para
// probar desde el celular) — una variable de build tiene prioridad incluso sobre un build
// de producción en Vite, así que esa IP privada terminó publicada en meiti.dev. Relativo
// ('') funciona siempre, sin variable de entorno: en dev, vite.config.ts hace de proxy de
// '/api' hacia el backend local; en producción, nginx hace exactamente lo mismo.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

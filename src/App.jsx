import React, { useState } from 'react';
import { extraerUI } from './core/MotorUI';
import ConfiguracionConexiones from './core/ConfiguracionConexiones';
import esquema from './esquema.json';

export default function App() {
  const [mostrarConexiones, setMostrarConexiones] = useState(false);
  return (
    <div className="h-screen w-full overflow-hidden">
      {extraerUI(esquema, false, "TablerosNorte_muugzt8s", false, "TablerosNorte")}
      <button
        onClick={() => setMostrarConexiones(true)}
        title="Conexiones y login"
        className="fixed bottom-4 right-4 z-40 w-11 h-11 rounded-full bg-gray-800 text-white shadow-lg flex items-center justify-center hover:bg-gray-700"
      >
        <i className="fas fa-gear"></i>
      </button>
      {mostrarConexiones && <ConfiguracionConexiones onCerrar={() => setMostrarConexiones(false)} />}
    </div>
  );
}

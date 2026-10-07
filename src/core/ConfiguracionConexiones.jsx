import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/apiConfig';

const ConfiguracionConexiones = ({ onCerrar }) => {
  const [estados, setEstados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [aviso, setAviso] = useState('');
  const [formLogin, setFormLogin] = useState({ llave_secreta: '', remitente: '' });
  const [guardandoLogin, setGuardandoLogin] = useState(false);

  const cargarEstados = () => {
    fetch(`${API_BASE_URL}/api/conexiones/estado`)
      .then(res => res.json())
      .then(data => setEstados(Array.isArray(data) ? data : []))
      .catch(() => setEstados([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarEstados(); }, []);

  const actualizarCampo = (servicio, campo, valor) => {
    setForm(prev => ({ ...prev, [servicio]: { ...prev[servicio], [campo]: valor } }));
  };

  const guardar = async (servicio) => {
    setGuardando(servicio);
    setAviso('');
    try {
      const datos = form[servicio] || {};
      const res = await fetch(`${API_BASE_URL}/api/configuracion/conexiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicio, ...datos })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo guardar.');
      setAviso(`Conexión "${servicio}" guardada.`);
      cargarEstados();
    } catch (error) {
      setAviso(error.message);
    } finally {
      setGuardando(null);
    }
  };

  const guardarLogin = async () => {
    setGuardandoLogin(true);
    setAviso('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/configuracion/conexiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicio: 'resend_login', ...formLogin })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo guardar.');
      setAviso('Configuración de login guardada.');
    } catch (error) {
      setAviso(error.message);
    } finally {
      setGuardandoLogin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Conexiones externas</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Esta app necesita datos de servicios externos. Tu credencial queda guardada solo en tu base de datos local — nunca sale de acá.
        </p>
        {aviso && <div className="mb-4 text-sm text-blue-600">{aviso}</div>}
        {cargando ? (
          <div className="text-sm text-gray-400">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {estados.map(({ servicio, conectado }) => (
              <div key={servicio} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">{servicio}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${conectado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {conectado ? 'Conectado' : 'Sin configurar'}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Llave/API key (o deja vacío si usas token)"
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onChange={e => actualizarCampo(servicio, 'llave_secreta', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Token de autorización (Bearer) — opcional"
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onChange={e => actualizarCampo(servicio, 'token_auth', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Dominio del servicio (ej. api.ejemplo.com)"
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onChange={e => actualizarCampo(servicio, 'dominio_confiado', e.target.value)}
                />
                <button
                  onClick={() => guardar(servicio)}
                  disabled={guardando === servicio}
                  className="w-full bg-gray-800 text-white text-sm font-semibold py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {guardando === servicio ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="border border-gray-200 rounded-lg p-4 mt-4">
          <span className="font-semibold text-gray-700">Login por email (envío de códigos)</span>
          <p className="text-xs text-gray-500 my-2">Necesitas una cuenta de Resend (gratis para empezar) para poder mandar los códigos de acceso a tus usuarios.</p>
          <input
            type="text"
            placeholder="Resend API key (re_...)"
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={formLogin.llave_secreta}
            onChange={e => setFormLogin(prev => ({ ...prev, llave_secreta: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Remitente (ej. MiApp <noreply@midominio.com>)"
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={formLogin.remitente}
            onChange={e => setFormLogin(prev => ({ ...prev, remitente: e.target.value }))}
          />
          <button
            onClick={guardarLogin}
            disabled={guardandoLogin}
            className="w-full bg-gray-800 text-white text-sm font-semibold py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {guardandoLogin ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionConexiones;

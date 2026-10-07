import React, { useRef, useState, useEffect, useCallback } from 'react';

// ↔️ [2026-08-20, reporte del usuario: "en las etiquetas deslizables… algo que permita moverlas con
// el mouse, actualmente no se puede"] Tenía razón, y era un agujero real: la fila esconde su barra
// de scroll a propósito (queda fea y ocupa lugar), así que en un teléfono se mueve con el dedo pero
// en una computadora no había NINGUNA forma de llegar a lo que quedaba fuera de la vista. Las
// etiquetas o las apps que no entraban en pantalla eran, en la práctica, invisibles para quien usa
// mouse.
//
// De las opciones que planteó el usuario (arrastrar con el mouse, botones al costado, o una barra
// de scroll), van los BOTONES:
//   - arrastrar pelea con el click: estas piezas son botones, y un click que se mueve un píxel se
//     interpreta como arrastre y no dispara;
//   - convertir la rueda del mouse en desplazamiento horizontal secuestra el scroll de la página,
//     que es de las cosas que más molestan cuando no la pediste;
//   - una barra de scroll vuelve a traer lo que sacamos a propósito.
// Los botones además AVISAN que hay más — que es la mitad del problema: nadie desliza lo que no
// sabe que sigue.
//
// Aparecen solo cuando hacen falta (si todo entra en pantalla, no se dibujan) y solo de 640px para
// arriba: en un teléfono el dedo ya resuelve y taparían contenido en la pantalla más chica.
export default function FilaDeslizable({ children, className = '', etiquetaAnterior = 'Ver anteriores', etiquetaSiguiente = 'Ver más' }) {
  const filaRef = useRef(null);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(false);

  const medir = useCallback(() => {
    const fila = filaRef.current;
    if (!fila) return;
    // 1px de tolerancia: los navegadores devuelven fracciones y sin esto la flecha derecha queda
    // encendida para siempre aunque ya no haya nada más.
    setPuedeIzquierda(fila.scrollLeft > 1);
    setPuedeDerecha(fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const fila = filaRef.current;
    if (!fila) return;
    medir();
    fila.addEventListener('scroll', medir, { passive: true });
    // ResizeObserver y no un listener de "resize" de la ventana: la fila también cambia de tamaño
    // cuando cambia su CONTENIDO (llegan las apps del servidor, se habilita una herramienta más),
    // y eso la ventana no lo avisa.
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(fila);
    return () => {
      fila.removeEventListener('scroll', medir);
      observador?.disconnect();
    };
  }, [medir, children]);

  const deslizar = (direccion) => {
    const fila = filaRef.current;
    if (!fila) return;
    // 80% del ancho visible y no una cantidad fija de píxeles: así el salto es proporcional a lo
    // que la persona está viendo, y siempre queda algo del borde anterior a la vista para no
    // perder la referencia de dónde estaba.
    fila.scrollBy({ left: direccion * fila.clientWidth * 0.8, behavior: 'smooth' });
  };

  const claseFlecha = 'hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-superficie border border-borde shadow-md text-texto-suave hover:text-acento hover:border-acento-suave transition-colors';

  return (
    <div className="relative w-full">
      <div ref={filaRef} className={`meiti-fila-deslizable ${className}`}>
        {children}
      </div>

      {puedeIzquierda && (
        <button type="button" onClick={() => deslizar(-1)} aria-label={etiquetaAnterior} className={`${claseFlecha} left-0 -ml-1`}>
          <i className="fa-solid fa-chevron-left text-xs"></i>
        </button>
      )}
      {puedeDerecha && (
        <button type="button" onClick={() => deslizar(1)} aria-label={etiquetaSiguiente} className={`${claseFlecha} right-0 -mr-1`}>
          <i className="fa-solid fa-chevron-right text-xs"></i>
        </button>
      )}
    </div>
  );
}

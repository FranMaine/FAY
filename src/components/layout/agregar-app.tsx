'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';

const PASOS_IPHONE = [
  'Abrí Orzando en Safari (en Chrome de iPhone no aparece esta opción).',
  'Tocá el botón Compartir (el cuadrado con una flecha hacia arriba, en la barra de abajo).',
  'Bajá en la lista y tocá "Agregar a pantalla de inicio".',
  'Confirmá con "Agregar" arriba a la derecha. El ícono de Orzando queda en tu pantalla de inicio.',
];

const PASOS_ANDROID = [
  'Abrí Orzando en Chrome.',
  'Tocá los tres puntos (⋮) arriba a la derecha.',
  'Tocá "Instalar app" o "Agregar a pantalla principal".',
  'Confirmá con "Instalar" o "Agregar". El ícono de Orzando queda en tu pantalla de inicio.',
];

// Link del pie que abre un modal con cómo sumar Orzando a la pantalla de
// inicio como si fuera una app (iPhone y Android).
export function AgregarApp() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="hover:text-foreground hover:underline">
        Agregar app
      </button>

      <Modal isOpen={abierto} onClose={() => setAbierto(false)} className="w-full max-w-md">
        <div className="p-6 space-y-6 text-left">
          <div>
            <h2 className="text-lg font-bold">Agregá Orzando a tu celular</h2>
            <p className="text-sm text-muted-foreground mt-1">Queda como una app en tu pantalla de inicio, sin pasar por la tienda.</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">iPhone (Safari)</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm">
              {PASOS_IPHONE.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Android (Chrome)</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm">
              {PASOS_ANDROID.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </section>

          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="w-full rounded-full bg-primary-solid py-2 text-sm font-semibold text-white"
          >
            Entendido
          </button>
        </div>
      </Modal>
    </>
  );
}

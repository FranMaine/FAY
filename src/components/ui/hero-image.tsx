"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

// La foto del hero (ver src/app/page.tsx) tarda un momento en bajar -sobre
// todo la primera vez que se abre la PWA desde el ícono en el celular, recién
// agregado y sin caché. Sin esto, el <Image> de Next pasa de nada a la foto
// entera de un frame al otro apenas termina de descargar: un "pop" que, justo
// después del corte ya abrupto del splash nativo de iOS al contenido, se
// siente como un segundo golpe en vez de una entrada prolija.
export function HeroImage(props: ImageProps) {
  const [cargada, setCargada] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Si el navegador ya tenía la imagen en caché, el evento "load" puede
  // disparar antes de que React llegue a escuchar -sin este chequeo, la
  // foto quedaría transparente para siempre en una visita repetida.
  useEffect(() => {
    if (imgRef.current?.complete) setCargada(true);
  }, []);

  return (
    <Image
      {...props}
      ref={imgRef}
      onLoad={(evento) => {
        setCargada(true);
        props.onLoad?.(evento);
      }}
      className={`${props.className ?? ""} hero-image-fade ${cargada ? "opacity-100" : "opacity-0"}`}
    />
  );
}

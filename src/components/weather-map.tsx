"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type WeatherMapProps = {
  latitude: number;
  longitude: number;
  city: string;
};

export function WeatherMap({ latitude, longitude, city }: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let disposeMap: (() => void) | undefined;

    void import("leaflet").then((leaflet) => {
      if (disposed || !container.isConnected) return;

      const map = leaflet.map(container, { scrollWheelZoom: true }).setView(
        [latitude, longitude],
        7,
      );
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(map);
      leaflet
        .circleMarker([latitude, longitude], {
          radius: 12,
          color: "#7dd3fc",
          fillColor: "#38bdf8",
          fillOpacity: 0.75,
        })
        .bindPopup(city)
        .addTo(map);

      disposeMap = () => map.remove();
    });

    return () => {
      disposed = true;
      disposeMap?.();
    };
  }, [latitude, longitude, city]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={`Map showing ${city}`}
      className="h-80 w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
    />
  );
}

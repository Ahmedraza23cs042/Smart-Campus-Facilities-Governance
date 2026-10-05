// ✅ Leaflet marker for map pin placement — 100% independent
import React from 'react';
import { Marker, useMapEvents } from 'react-leaflet';

export default function LocationMarker({ selectedPosition, setSelectedPosition }) {
  useMapEvents({ click(e) { setSelectedPosition([e.latlng.lat, e.latlng.lng]); } });
  return selectedPosition === null ? null : <Marker position={selectedPosition}></Marker>;
}
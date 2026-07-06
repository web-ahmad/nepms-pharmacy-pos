'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface GeoData {
  area_zone: string;
  total_customers: number;
  total_sales: number;
}

// Dummy coordinates mapping for zones to avoid complex geocoding right now
const zoneCoordinates: Record<string, [number, number]> = {
  'DHA Phase 5': [31.4621, 74.3853], // Lahore example
  'Gulberg': [31.5165, 74.3486],
  'Unknown': [31.5204, 74.3587]
};

export default function GeoMap({ data }: { data: GeoData[] }) {
  // Center roughly
  const center: [number, number] = [31.5204, 74.3587];

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map((stat, idx) => {
          const coord = zoneCoordinates[stat.area_zone] || [center[0] + (Math.random() * 0.1), center[1] + (Math.random() * 0.1)];
          // Radius based on sales
          const radius = Math.max(10, Math.min(40, stat.total_sales / 1000));
          
          return (
            <CircleMarker 
              key={idx} 
              center={coord} 
              pathOptions={{ color: 'red', fillColor: '#f03', fillOpacity: 0.5 }}
              radius={radius}
            >
              <Tooltip>
                <div className="font-semibold text-gray-900">{stat.area_zone}</div>
                <div className="text-sm text-gray-600">Customers: {stat.total_customers}</div>
                <div className="text-sm text-gray-600">Sales: {stat.total_sales.toFixed(2)}</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

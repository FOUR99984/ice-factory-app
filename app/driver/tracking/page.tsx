'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DriverTrackingPage({ driverId }: { driverId: string }) {
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let watchId: number;

    if (isTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, heading, speed } = position.coords;
          setCoords({ lat: latitude, lng: longitude });

          // ອັບເດດ/Insert ຕຳແໜ່ງ GPS ລົງໃນ Supabase driver_locations
          const { error } = await supabase
            .from('driver_locations')
            .upsert(
              {
                driver_id: driverId,
                latitude,
                longitude,
                heading: heading || 0,
                speed: speed || 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'driver_id' }
            );

          if (error) console.error('Error updating location:', error);
        },
        (error) => console.error('GPS Error:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, driverId]);

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">ລະບົບຕິດຕາມຕຳແໜ່ງຄົນຂັບລົດ</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-700">ສະຖານະ GPS:</p>
        <p className="text-lg font-semibold text-blue-600">
          {coords ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` : 'ຍັງບໍ່ໄດ້ເປີດ GPS'}
        </p>
      </div>

      <button
        onClick={() => setIsTracking(!isTracking)}
        className={`w-full py-4 text-lg font-bold rounded-xl text-white ${
          isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isTracking ? '🛑 ປິດການແຊຣ໌ GPS' : '🚀 ເລີ່ມສົ່ງ GPS ສົ່ງນໍ້າກ້ອນ'}
      </button>
    </div>
  );
}
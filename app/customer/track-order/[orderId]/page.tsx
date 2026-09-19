'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { supabase } from '@/lib/supabaseClient';

const containerStyle = { width: '100%', height: '80vh' };

export default function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  // 1. ດຶງ driver_id ຈາກ Order
  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('driver_id')
        .eq('id', params.orderId)
        .single();

      if (data?.driver_id) {
        setDriverId(data.driver_id);
      }
    }
    fetchOrder();
  }, [params.orderId]);

  // 2. ດຶງຂໍ້ມູນ Real-time ຈາກ driver_locations ເມື່ອຄົນຂັບຍ້າຍ
  useEffect(() => {
    if (!driverId) return;

    // Fetch initial location
    supabase
      .from('driver_locations')
      .select('latitude, longitude')
      .eq('driver_id', driverId)
      .single()
      .then(({ data }) => {
        if (data) setDriverLocation({ lat: data.latitude, lng: data.longitude });
      });

    // Real-time listener
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload: any) => {
          const newLoc = payload.new;
          setDriverLocation({ lat: newLoc.latitude, lng: newLoc.longitude });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  if (!isLoaded) return <div>ກຳລັງໂຫຼດ Google Maps...</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">ຕິດຕາມລົດສົ່ງນໍ້າກ້ອນ (Real-time)</h1>
      {driverLocation ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={driverLocation}
          zoom={15}
        >
          {/* Marker ຕຳແໜ່ງລົດນໍ້າກ້ອນ */}
          <Marker
            position={driverLocation}
            icon={{
              url: '/ice-truck-icon.png', // ສາມາດໃສ່ icon ຮູບລົດນໍ້າກ້ອນໄດ້
              scaledSize: new window.google.maps.Size(40, 40),
            }}
          />
        </GoogleMap>
      ) : (
        <div className="p-8 text-center bg-gray-100 rounded-xl">
          ກຳລັງຄົ້ນຫາຕຳແໜ່ງລົດສົ່ງ...
        </div>
      )}
    </div>
  );
}
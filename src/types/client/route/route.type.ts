export interface City {
  city_id: number;
  city_name: string;
}

export interface Zone {
  zone_id: number;
  zone_name: string;
  zone_type: "DISTRICT" | "AREA" | "HUB";
}

export interface PickupPoint {
  pickup_point_id: number;
  point_name: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
}

export type PopularRoute = {
  route_id: number;
  origin_city: string;
  destination_city: string;
  destination_image_url: string | null;
  distance_km: number;
  estimated_duration: number;
  base_price: number;
};

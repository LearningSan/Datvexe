export type SelectedLocation = {
  type: "CITY" | "ZONE" | "OFFICE";

  id: number;

  label: string;

  cityId?: number;

  zoneId?: number;

  address?: string;
};

export type PickupPointItem = {
  pickup_point_id: number;

  point_name: string;

  address: string;

 zone_id: number | null;
};

export type ZoneSearchItem = {
  zone_id: number;

  zone_name: string;

  pickupPointCount: number;

  pickupPoints: PickupPointItem[];
};

export type CitySearchItem = {
  city_id: number;

  city_name: string;

  zones: ZoneSearchItem[];

  directPickupPoints: PickupPointItem[];
};

export type SearchLocationResponse =
  CitySearchItem[];

export type SearchCityRow = {
  city_id: number;

  city_name: string;
};

export type SearchZoneRow = {
  zone_id: number;

  zone_name: string;

  city_id: number;

  city_name: string;
};

export type SearchPickupPointRow = {
  pickup_point_id: number;

  point_name: string;

  address: string;

  city_id: number;

  city_name: string;

  zone_id: number | null;

  zone_name: string | null;
};

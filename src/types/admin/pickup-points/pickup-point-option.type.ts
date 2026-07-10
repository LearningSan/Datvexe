export interface AdminCityOption {
  cityId: number;
  cityName: string;
}

export interface AdminZoneOption {
  zoneId: number;
  cityId: number;
  zoneName: string;
  zoneType: "DISTRICT" | "AREA" | "HUB";
}

export interface User {
  id: string;
  name: string;
  phone: string;
  groupId?: string;
  role?: string;
  avatar?: string;
  location?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  isOnline: boolean;
  isPanic: boolean;
}

export interface Group {
  id: string;
  name: string;
  departureDate: string;
  returnDate: string;
  departureAirport: string;
  members: User[];
}

export interface PanicAlert {
  id: string;
  userId: string;
  userName: string;
  message: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: number;
  isResolved: boolean;
}

export interface AppSettings {
  isGpsActive: boolean;
  trackingInterval: number; // in seconds
  radiusLimit: number; // in meters
  isAppActive: boolean;
}

export interface ItineraryItem {
  id: string;
  day: number;
  date: string;
  time: string;
  activity: string;
  location: string;
  description?: string;
  icon?: string;
}

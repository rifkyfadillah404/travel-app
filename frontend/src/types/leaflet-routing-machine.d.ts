import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Routing {
    interface ControlOptions {
      waypoints?: L.LatLng[];
      router?: IRouter;
      plan?: Plan;
      geocoder?: IGeocoder;
      fitSelectedRoutes?: boolean | string;
      lineOptions?: LineOptions;
      routeWhileDragging?: boolean;
      routeDragInterval?: number;
      waypointMode?: string;
      useZoomParameter?: boolean;
      showAlternatives?: boolean;
      altLineOptions?: LineOptions;
      addWaypoints?: boolean;
      createMarker?: (i: number, waypoint: Waypoint, n: number) => L.Marker | null;
      containerClassName?: string;
    }

    interface LineOptions {
      styles?: L.PathOptions[];
      addWaypoints?: boolean;
      extendToWaypoints?: boolean;
      missingRouteTolerance?: number;
    }

    interface Waypoint {
      latLng: L.LatLng;
      name?: string;
      options?: WaypointOptions;
    }

    interface WaypointOptions {
      allowUTurn?: boolean;
    }

    interface RouteSummary {
      totalDistance: number;
      totalTime: number;
    }

    interface Route {
      name: string;
      summary: RouteSummary;
      coordinates: L.LatLng[];
      waypoints: Waypoint[];
      instructions: unknown[];
    }

    interface RoutingResultEvent {
      routes: Route[];
    }

    interface IRouter {
      route(waypoints: Waypoint[], callback: (err: Error | null, routes: Route[]) => void): void;
    }

    interface IGeocoder {
      geocode(query: string, callback: (results: unknown[]) => void): void;
      reverse(location: L.LatLng, scale: number, callback: (results: unknown[]) => void): void;
    }

    interface Plan extends L.Class {
      setWaypoints(waypoints: L.LatLng[]): this;
      getWaypoints(): Waypoint[];
    }

    class Control extends L.Control {
      constructor(options?: ControlOptions);
      getWaypoints(): Waypoint[];
      setWaypoints(waypoints: L.LatLng[]): this;
      spliceWaypoints(index: number, waypointsToRemove: number, ...waypoints: L.LatLng[]): Waypoint[];
      getPlan(): Plan;
      getRouter(): IRouter;
      route(): void;
      on(type: string, fn: (e: RoutingResultEvent) => void): this;
    }

    function control(options?: ControlOptions): Control;
  }
}

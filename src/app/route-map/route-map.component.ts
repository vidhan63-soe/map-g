import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { RouteService } from '../services/route.service';

@Component({
  selector: 'route-map',
  templateUrl: './route-map.component.html',
  styleUrls: ['./route-map.component.scss']
})
export class RouteMapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
  private routeLayer!: L.LayerGroup;
  private originMarker!: L.Marker;
  private destMarker!: L.Marker;
  private routeLines: L.Polyline[] = [];
  private _searchHistory: { origin: string, destination: string, routes: [number, number][][] }[] = [];

  inputMethod: 'manual' | 'map' = 'manual';
  originLat: number = 12.9716; // Default origin (Bangalore)
  originLng: number = 77.5946;
  destLat: number = 12.9716;  // Default destination
  destLng: number = 77.5946;
  currentSearchIndex: number = -1;

  selectingOrigin: boolean = true; // Control whether user is selecting origin or destination

  constructor(private routeService: RouteService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initializeMap();
    this.loadHistory();
  }

  initializeMap() {
    this.map = L.map('map', {
      center: [12.9716, 77.5946],
      zoom: 12,
      maxBounds: L.latLngBounds(
        L.latLng(12.8, 77.4),
        L.latLng(13.1, 77.7)
      ),
      maxZoom: 18,
      minZoom: 10
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.routeLayer = L.layerGroup().addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.inputMethod === 'map') {
        this.handleMapClick(e.latlng);
      }
    });
  }

  handleMapClick(latlng: L.LatLng) {
    if (this.selectingOrigin) {
      // User is selecting the origin
      this.originLat = latlng.lat;
      this.originLng = latlng.lng;

      if (this.originMarker) this.map.removeLayer(this.originMarker);
      this.originMarker = L.marker(latlng, { title: 'Origin' }).addTo(this.routeLayer)
        .bindPopup('Origin').openPopup();

      this.selectingOrigin = false; // Now allow the user to select the destination
    } else {
      // User is selecting the destination
      this.destLat = latlng.lat;
      this.destLng = latlng.lng;

      if (this.destMarker) this.map.removeLayer(this.destMarker);
      this.destMarker = L.marker(latlng, { title: 'Destination' }).addTo(this.routeLayer)
        .bindPopup('Destination').openPopup();

      this.calculateRoute(); // Calculate the route once both points are selected
    }
  }

  calculateRoute() {
    // Use default Bangalore coordinates if origin is not set
    const finalOriginLat = this.originLat || 12.9716;
    const finalOriginLng = this.originLng || 77.5946;

    // Destination must be specified
    if (!this.destLat || !this.destLng) {
      alert('Please select a destination.');
      return;
    }

    this.routeService.calculateRoute({
      origin: [finalOriginLat, finalOriginLng],
      destination: [this.destLat, this.destLng]
    }).subscribe({
      next: (routeData) => {
        // Update the origin coordinates to the used values
        this.originLat = finalOriginLat;
        this.originLng = finalOriginLng;
        
        this.renderRoutes(routeData.coordinates);
      },
      error: (err) => {
        alert('Failed to calculate route.');
        console.error(err);
      }
    });
  }

  renderRoutes(routes: [number, number][][]) {
    // Clear existing layers
    this.routeLayer.clearLayers();
    this.routeLines = [];

    routes.forEach((route, index) => {
      // Render route lines
      const routeLine = L.polyline(route, {
        color: routes.length > 1 ? (index === 0 ? 'blue' : 'green') : 'blue',
        weight: 5,
        opacity: 0.7
      }).addTo(this.routeLayer);
      this.routeLines.push(routeLine);

      // Add markers at the start and end of each route
      if (index === 0) {
        // Origin marker at the start of the first route
        this.originMarker = L.marker(route[0], { 
          title: 'Origin',
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: green; width: 20px; height: 20px; border-radius: 50%;"></div>`
          })
        }).addTo(this.routeLayer).bindPopup('Origin');
      }

      // Destination marker at the end of the last route
      if (index === routes.length - 1) {
        this.destMarker = L.marker(route[route.length - 1], { 
          title: 'Destination',
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: red; width: 20px; height: 20px; border-radius: 50%;"></div>`
          })
        }).addTo(this.routeLayer).bindPopup('Destination');
      }
    });

    // Fit map to all routes
    const allRoutesBounds = L.latLngBounds(routes.flat());
    this.map.fitBounds(allRoutesBounds);

    // Save to search history
    this._searchHistory.push({
      origin: `${this.originLat}, ${this.originLng}`,
      destination: `${this.destLat}, ${this.destLng}`,
      routes: routes
    });

    localStorage.setItem('routeSearchHistory', JSON.stringify(this._searchHistory));
  }

  selectFromHistory(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const index = selectElement.value;
    
    const history = this._searchHistory[parseInt(index)];
    const origin = history.origin.split(', ').map(coord => parseFloat(coord));
    const destination = history.destination.split(', ').map(coord => parseFloat(coord));
  
    this.originLat = origin[0];
    this.originLng = origin[1];
    this.destLat = destination[0];
    this.destLng = destination[1];
    this.calculateRoute();
  }

  loadHistory() {
    const historyData = localStorage.getItem('routeSearchHistory');
    if (historyData) {
      this._searchHistory = JSON.parse(historyData);
    }
  }

  get searchHistory() {
    return this._searchHistory;
  }
}
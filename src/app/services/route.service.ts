import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  // Python backend URL (typically running on localhost:5000)
  private apiUrl = 'http://localhost:5000/calculate-route';

  constructor(private http: HttpClient) { }

  calculateRoute(routeData: {
    origin: [number, number], 
    destination: [number, number]
  }): Observable<any> {
    return this.http.post(this.apiUrl, routeData);
  }
}
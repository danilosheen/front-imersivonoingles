import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeadData {
  name: string;
  email?: string;
  phone?: string;
  type: 'email' | 'whatsapp';
}

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);

  // URL local por padrão. Altere para a URL do seu deploy na Vercel quando estiver online.
  private readonly apiUrl = 'https://back-imersivonoingles.vercel.app/api/leads';

  sendLead(lead: LeadData): Observable<any> {
    return this.http.post(this.apiUrl, lead);
  }
}

import { Environment } from '@abp/ng.core';

const baseUrl = 'https://hotel-management.shahainalsharabi2.workers.dev';
/** Same origin — Cloudflare worker proxies /api to Render (avoids CORS). */
const apiUrl = baseUrl;
const authIssuer = 'https://hotel-api-fo0z.onrender.com';

export const environment = {
  production: true,
  application: {
    baseUrl,
    name: 'Hotel',
    logoUrl: '',
  },
  oAuthConfig: {
    issuer: `${authIssuer}/`,
    redirectUri: baseUrl,
    clientId: 'Hotel_App',
    responseType: 'code',
    scope: 'offline_access Hotel',
    requireHttps: true
  },
  apis: {
    default: {
      url: apiUrl,
      rootNamespace: 'Modiaf.Al.Arab.Hotel',
    },
  },
} as Environment;

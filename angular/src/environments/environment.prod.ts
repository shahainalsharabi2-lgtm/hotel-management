import { Environment } from '@abp/ng.core';

const apiUrl = 'https://hotel-api-fo0z.onrender.com';
const baseUrl = 'https://example.pages.dev';

export const environment = {
  production: true,
  application: {
    baseUrl,
    name: 'Hotel',
    logoUrl: '',
  },
  oAuthConfig: {
    issuer: `${apiUrl}/`,
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

import { Environment } from '@abp/ng.core';

const baseUrl = 'https://localhost:4200';

export const environment = {
  production: true,
  application: {
    baseUrl,
    name: 'Hotel',
    logoUrl: '',
  },
  oAuthConfig: {
    issuer: 'https://localhost:44367/',
    redirectUri: baseUrl,
    clientId: 'Hotel_App',
    responseType: 'code',
    scope: 'offline_access Hotel',
    requireHttps: true
  },
  apis: {
    default: {
      url: 'https://localhost:44367',
      rootNamespace: 'Modiaf.Al.Arab.Hotel',
    },
  },
} as Environment;

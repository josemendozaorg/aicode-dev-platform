#!/usr/bin/env node

import http from 'http';
import { env } from './config/environment';

const healthCheck = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const options = {
      host: 'localhost',
      port: env.PORT,
      path: '/health',
      timeout: 2000,
    };

    const req = http.get(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Health check failed with status: ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
};

healthCheck()
  .then(() => {
    console.log('Health check passed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });
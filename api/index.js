import { createApp } from '../server.js';

const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}

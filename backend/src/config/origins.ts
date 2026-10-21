// Vite may choose the next port when another local dev server is running.
// Keep REST and Socket.IO origins identical.
export function getAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_ORIGIN;
  if (configured) return configured.split(',').map(origin => origin.trim()).filter(Boolean);
  return [5173, 5174, 5175].flatMap(port => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);
}

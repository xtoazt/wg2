
export default function config() {
  const isHttps = window ? (window.location.protocol === "https:") : true;
const prefixHttp = (isHttps ? "https" : "http")+"://";
const prefixWs = (isHttps ? "wss" : "ws")+"://";

  // Use Vercel app URL for API calls (Next.js API routes)
  const apiUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return {
  "apiUrl": apiUrl,
  "websocketUrl": prefixWs+(process.env.NEXT_PUBLIC_WS_HOST ?? "server.atlas.com")+'/wg',
  }
}
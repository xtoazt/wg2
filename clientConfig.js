
export default function config() {
  const isHttps = window ? (window.location.protocol === "https:") : true;
const prefixHttp = (isHttps ? "https" : "http")+"://";
const prefixWs = (isHttps ? "wss" : "ws")+"://";

  // Use the correct API URL
  const apiUrl = 'https://api.worldguessr.com';

  return {
  "apiUrl": apiUrl,
  "websocketUrl": prefixWs+(process.env.NEXT_PUBLIC_WS_HOST ?? process.env.NEXT_PUBLIC_API_URL ?? "localhost:3002")+'/wg',
  }
}
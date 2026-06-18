import withPWAInit from "next-pwa";
import os from "os";

const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
        ips.push(`${iface.address}:3000`);
      }
    }
  }
  return ips;
};

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  env: {
    VITE_STAFF_PIN: process.env.VITE_STAFF_PIN ?? '',
    VITE_MANAGER_PIN: process.env.VITE_MANAGER_PIN ?? '',
    VITE_DEV_MODE: process.env.VITE_DEV_MODE ?? '',
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    ...getLocalIPs()
  ],
};

export default withPWA(nextConfig);

import withPWAInit from "next-pwa";

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
};

export default withPWA(nextConfig);

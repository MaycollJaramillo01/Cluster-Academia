const configured = process.env.ACADEMIA_BASE_URL?.trim();
const deployment = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

/** Public base URL for application links. Preview links stay in their deployment. */
export const academyOrigin = new URL(
  (process.env.VERCEL_ENV === 'preview' ? deployment || configured : configured || deployment)
  || 'http://localhost:3000',
).origin;

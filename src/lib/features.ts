/**
 * Build-time feature flags.
 *
 * The village screen (src/routes/wioska.tsx) is finished enough to render but
 * the game behind it is not designed yet, so its entry point stays hidden while
 * the route keeps working for anyone who types the URL.
 */
export const VILLAGE_ENABLED = false;

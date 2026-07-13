/*
====================================
LOGGER UTILS
====================================
*/

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (...args) => {
    if (isDev) console.log("[INFO]", ...args);
  },
  warn: (...args) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args) => {
    console.error("[ERROR]", ...args);
  },
  debug: (...args) => {
    if (isDev) console.debug("[DEBUG]", ...args);
  },
};
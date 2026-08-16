let activeJobs = 0;
let pingInterval: ReturnType<typeof setInterval> | null = null;

const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
const PING_INTERVAL_MS = 4 * 60 * 1000; // every 4 minutes, safely under the 15-min idle window

function startPinging() {
  if (pingInterval) return; // already running

  pingInterval = setInterval(async () => {
    try {
      await fetch(`${SELF_URL}/api/health`);
      console.log('Keep-alive ping sent');
    } catch (err) {
      console.error('Keep-alive ping failed:', err);
    }
  }, PING_INTERVAL_MS);
}

function stopPinging() {
  if (pingInterval && activeJobs === 0) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

export function jobStarted() {
  activeJobs++;
  startPinging();
}

export function jobFinished() {
  activeJobs = Math.max(0, activeJobs - 1);
  stopPinging();
}
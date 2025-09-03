// Simple cached fetcher for data from public/api.json
// Exports helpers to get, refresh, and clear the cached data

let cachedApiData = null;
let inFlightFetch = null;

function resolveApiUrl() {
  const baseUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/apii.json`;
}

async function fetchApiJson(options = {}) {
  const url = resolveApiUrl();
  const response = await fetch(url, {
    // For normal fetches, allow HTTP caching; for refresh, caller can pass { cache: 'no-store' }
    cache: options.cache || "default",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch API data: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function getApiData({ forceRefresh = false } = {}) {
  if (cachedApiData && !forceRefresh) {
    return cachedApiData;
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const data = await fetchApiJson({
        cache: forceRefresh ? "no-store" : "default",
      });
      cachedApiData = data;
      return data;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

export function clearApiCache() {
  cachedApiData = null;
}

export async function refreshApiData() {
  clearApiCache();
  return getApiData({ forceRefresh: true });
}

export default getApiData;

export async function getPosition(locationSelector) {
  const data = await getApiData();
  const record = Array.isArray(data) ? data[locationSelector] : null;
  const pos = record?.pos;
  if (!Array.isArray(pos) || pos.length < 3) {
    throw new Error("Position not found at api[ idx ].pos");
  }
  return { x: pos[0], y: pos[1], z: pos[2] };
}

export async function getRotation(locationSelector) {
  const data = await getApiData();
  const record = Array.isArray(data) ? data[locationSelector] : null;
  const rot = record?.rot_quat;
  if (!Array.isArray(rot) || rot.length < 4) {
    throw new Error("Rotation not found at api[ idx ].rot_quat");
  }
  return { x: rot[0], y: rot[1], z: rot[2], w: rot[3] };
}

export async function getPanos(resolution = "low", locationSelector) {
  // For the new API schema, each location has a single equirectangular image at `image`
  const data = await getApiData();
  const record = Array.isArray(data) ? data[locationSelector] : null;
  const img = record?.image;
  if (!img) {
    throw new Error("Image not found at api[ idx ].image");
  }
  const normalized = img.startsWith("/") ? img : `/${img}`;
  return [normalized];
}

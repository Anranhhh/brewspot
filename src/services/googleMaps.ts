type GoogleMapsGlobal = {
  maps: {
    importLibrary: (library: string) => Promise<any>;
    [key: string]: any;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
  }
}

let scriptPromise: Promise<GoogleMapsGlobal> | null = null;
let placesLibraryPromise: Promise<any> | null = null;

export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
}

export function loadGoogleMapsScript(): Promise<GoogleMapsGlobal> {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (scriptPromise) return scriptPromise;

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error('Google Maps API key is missing from this build.'));
  }

  scriptPromise = new Promise<GoogleMapsGlobal>((resolve, reject) => {
    const existing = document.querySelector('script[data-brewspot-google-maps], script[data-brewspot-google-places], script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps?.importLibrary) resolve(window.google);
        else reject(new Error('Google Maps loaded without importLibrary.'));
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.brewspotGoogleMaps = 'true';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&libraries=places&loading=async';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.importLibrary) resolve(window.google);
      else reject(new Error('Google Maps loaded without importLibrary.'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Unable to load Google Maps.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function loadGooglePlaces(): Promise<any> {
  if (placesLibraryPromise) return placesLibraryPromise;
  placesLibraryPromise = loadGoogleMapsScript()
    .then((google) => google.maps.importLibrary('places'))
    .catch((error) => {
      placesLibraryPromise = null;
      throw error;
    });
  return placesLibraryPromise;
}

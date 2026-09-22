import { useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Search, X } from 'lucide-react';
import { Cafe } from '../types';
import * as api from '../services/api';

type GoogleCandidate = {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  type?: string;
};

type Props = { value: Cafe | null; onChange: (cafe: Cafe | null) => void; initialCafes?: Cafe[] };

function loadPlaces(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.places?.Place) return Promise.resolve(w.google.maps.places);
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Places is not configured.'));
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-brewspot-google-places]') as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => resolve(w.google.maps.places)); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script');
    script.dataset.brewspotGooglePlaces = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.async = true; script.defer = true;
    script.onload = () => resolve(w.google.maps.places);
    script.onerror = () => reject(new Error('Unable to load Google Places.'));
    document.head.appendChild(script);
  });
}

export default function CafePicker({ value, onChange, initialCafes = [] }: Props) {
  const [query, setQuery] = useState('');
  const [cafes, setCafes] = useState<Cafe[]>(initialCafes);
  const [googleResults, setGoogleResults] = useState<GoogleCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A café can be removed in Supabase while the app still has the old object
  // in memory (especially when New Post was opened from a detail screen).
  // Validate it before showing it as selected.
  useEffect(() => {
    if (!value) return;
    let active = true;
    api.getCafeById(value.id).then((fresh) => {
      if (active) {
        setCafes(current => [...current.filter(c => c.id !== fresh.id), fresh]);
        onChange(fresh);
      }
    }).catch(() => {
      if (active) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id);
        // A non-UUID value can be a fresh Google Places result from Explore;
        // NewPost will persist it before creating the post.
        if (isUuid && !value.googlePlaceId) {
          onChange(null);
          setError('That café is no longer available. Please select another café.');
        }
      }
    });
    return () => { active = false; };
  }, [value?.id]);

  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cafes.slice(0, 20);
    return cafes.filter(c => `${c.name} ${c.address}`.toLowerCase().includes(q)).slice(0, 20);
  }, [cafes, query]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.searchCafes(query);
        setCafes(current => {
          const merged = new Map([...current, ...result].map(c => [c.id, c]));
          return [...merged.values()];
        });
      } catch { /* Google remains available if the local search is unavailable. */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchGoogle = async () => {
    setError(null); setLoading(true); setGoogleResults([]);
    try {
      const places = await loadPlaces();
      const { places: results } = await places.Place.searchByText({
        textQuery: query.trim(),
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'types'],
        maxResultCount: 8,
      });
      setGoogleResults((results || []).map((place: any) => ({
        id: place.id,
        name: place.displayName?.text || place.displayName || '',
        address: place.formattedAddress || '',
        latitude: place.location?.lat?.(), longitude: place.location?.lng?.(),
        rating: place.rating, userRatingCount: place.userRatingCount,
        priceLevel: place.priceLevel, type: place.types?.[0] || 'Cafe',
      })).filter((place: GoogleCandidate) => place.id && place.name));
    } catch (e: any) { setError(e.message || 'Could not search Google Places.'); }
    finally { setLoading(false); }
  };

  const chooseGoogle = async (place: GoogleCandidate) => {
    setLoading(true); setError(null);
    try {
      const cafe = await api.createCafeFromGoogle({
        google_place_id: place.id, name: place.name, address: place.address,
        latitude: place.latitude, longitude: place.longitude,
        google_rating: place.rating, google_rating_count: place.userRatingCount,
        price_level: place.priceLevel, cafe_type: place.type,
      });
      setCafes(current => [...current.filter(c => c.id !== cafe.id), cafe]);
      onChange(cafe); setGoogleResults([]); setQuery('');
    } catch (e: any) { setError(e.message || 'Could not save this café.'); }
    finally { setLoading(false); }
  };

  return <div className="space-y-3">
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input value={value ? value.name : query} onChange={e => { onChange(null); setQuery(e.target.value); }} placeholder="Search BrewSpot cafés" className="w-full rounded-xl bg-slate-50 border border-slate-200 py-3 pl-11 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      {value && <button type="button" onClick={() => { onChange(null); setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
    </div>
    {!value && <div className="max-h-48 overflow-y-auto space-y-2">
      {localResults.map(cafe => <button type="button" key={cafe.id} onClick={() => { onChange(cafe); setQuery(''); }} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-primary/40 flex items-center gap-3"><MapPin className="w-4 h-4 text-primary shrink-0" /><span className="min-w-0"><span className="block font-semibold text-sm truncate">{cafe.name}</span><span className="block text-xs text-slate-400 truncate">{cafe.address}</span></span></button>)}
    </div>}
    {value && <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2 text-sm font-semibold"><Check className="w-4 h-4 text-primary" />{value.name}<span className="text-slate-400 font-normal truncate">{value.address}</span></div>}
    {!value && query.trim().length >= 2 && <button type="button" onClick={searchGoogle} disabled={loading} className="w-full rounded-xl border border-dashed border-primary/40 p-3 text-sm font-semibold text-primary disabled:opacity-50">{loading ? 'Searching…' : 'Can’t find it? Search Google Places'}</button>}
    {!value && googleResults.length > 0 && <div className="space-y-2"><p className="text-[11px] text-slate-400">Powered by Google</p>{googleResults.map(place => <button type="button" key={place.id} onClick={() => void chooseGoogle(place)} className="w-full text-left p-3 rounded-xl bg-white border border-slate-200"><span className="block font-semibold text-sm">{place.name}</span><span className="block text-xs text-slate-400">{place.address}</span></button>)}</div>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>;
}

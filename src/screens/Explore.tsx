import { useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, Navigation, Heart, MapPin, Star, ChevronLeft, RefreshCw } from 'lucide-react';
import { Cafe, Screen } from '../types';

// Declare global window interfaces for TypeScript safety
declare global {
    interface Window {
        google?: any;
    }
}

type ExploreScreenProps = {
    cafes: Cafe[]; // Saved/loaded cafes from the backend database
    onSelectCafe: (cafe: Cafe) => void;
    onNavigate: (s: Screen, data?: any) => void;
    isLoading?: boolean;
    feedError?: string | null;
    onRetryFeed?: () => void;
    onSaveCafe?: (cafeId: string, cafeDetails?: Cafe) => void;
};

interface LatLng {
    lat: number;
    lng: number;
}

// Global script loading state variables
let isScriptLoaded = false;
let scriptLoadPromise: Promise<any> | null = null;

/**
 * Dynamically load the Google Maps JavaScript API script.
 * @param apiKey Google Maps API Key
 * @returns Promise resolving to the google object
 */
function loadGoogleMapsScript(apiKey: string): Promise<any> {
    if (isScriptLoaded) return Promise.resolve(window.google);
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            isScriptLoaded = true;
            resolve(window.google);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            isScriptLoaded = true;
            resolve(window.google);
        };
        script.onerror = (err) => {
            scriptLoadPromise = null;
            reject(err);
        };
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

/**
 * Helper to generate a deterministic UUID v5 from a string (such as a Google Place ID).
 * Matches the backend implementation `uuid.uuid5(uuid.NAMESPACE_DNS, name)`.
 * @param name String to hash
 * @returns Deterministic UUID string
 */
async function resolveUuidV5(name: string): Promise<string> {
    // DNS Namespace UUID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    const namespaceBytes = new Uint8Array([
        0x6b, 0xa7, 0xb8, 0x10,
        0x9d, 0xad,
        0x11, 0xd1,
        0x80, 0xb4,
        0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8
    ]);
    const nameBytes = new TextEncoder().encode(name);
    const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
    combined.set(namespaceBytes);
    combined.set(nameBytes, namespaceBytes.length);
    
    const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
    const hashBytes = new Uint8Array(hashBuffer);
    
    // Set UUID v5 bits (version 5, variant RFC 4122)
    hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
    hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;
    
    const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Retrieve coordinates for a given cafe.
 * @param cafe Cafe data
 * @param userCoords Optional user coordinates
 * @returns LatLng coordinates object
 */
const getCafeCoords = (cafe: Cafe): LatLng => {
    if (cafe.latitude !== undefined && cafe.latitude !== null &&
        cafe.longitude !== undefined && cafe.longitude !== null) {
        return { lat: cafe.latitude, lng: cafe.longitude };
    }
    // Fallback default
    return { lat: 40.7465, lng: -74.0014 };
};

/**
 * Explore Screen Component
 */
export default function Explore({
    cafes,
    onSelectCafe,
    onNavigate,
    isLoading = false,
    feedError = null,
    onRetryFeed,
    onSaveCafe,
}: ExploreScreenProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const categories = ['Top Rated', 'Open Now', 'Wi-Fi', 'Outdoor'];
    const [activeCategory, setActiveCategory] = useState('Top Rated');

    // Google Maps and dynamic Places States
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<any>(null);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    
    const [googleCafes, setGoogleCafes] = useState<Cafe[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const [overlays, setOverlays] = useState<Array<{ id: string; container: HTMLDivElement }>>([]);
    const [userOverlay, setUserOverlay] = useState<{ container: HTMLDivElement } | null>(null);
    const [hasMoved, setHasMoved] = useState(false);
    const [locationAttempted, setLocationAttempted] = useState(false);

    const selectedCafe = googleCafes.find((c) => c.id === selectedId) ?? googleCafes[0];
    const [searchQuery, setSearchQuery] = useState('');

    // Sync selected id logic when places change
    useEffect(() => {
        if (!googleCafes.length) return;
        const stillValid = selectedId != null && googleCafes.some((c) => c.id === selectedId);
        if (!stillValid) {
            setSelectedId(googleCafes[0].id);
        }
    }, [googleCafes, selectedId]);

    // Sync search input query with selected cafe name
    useEffect(() => {
        if (selectedCafe) {
            setSearchQuery(selectedCafe.name);
        }
    }, [selectedCafe]);

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(coords);
                    setLocationAttempted(true);
                },
                (err) => {
                    console.log('User denied location permissions or geolocation failed:', err);
                    setLocationAttempted(true);
                },
                { timeout: 5000 }
            );
        } else {
            setLocationAttempted(true);
        }
    }, []);

    // Load Google Maps API SDK script
    useEffect(() => {
        const apiKey = 'AIzaSyDvOmhm78lB44SyVUV_LKRuJfdZk4Z5TtM';
        loadGoogleMapsScript(apiKey)
            .then(() => {
                setMapsLoaded(true);
            })
            .catch((err) => {
                console.error('Failed to load Google Maps SDK script:', err);
            });
    }, []);

    // Initialize Map Instance
    useEffect(() => {
        if (!mapsLoaded || !mapRef.current || map || !locationAttempted) return;

        const google = window.google;
        const initialCenter = userLocation || { lat: 40.7465, lng: -74.0014 }; // Chelsea coordinates default or user location

        const mapInstance = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            styles: [
                {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{ "visibility": "off" }]
                }
            ]
        });

        setMap(mapInstance);
    }, [mapsLoaded, locationAttempted, map, userLocation]);

    const triggerDatabaseFallback = () => {
        const mappedDbCafes = cafes.map((cafe) => {
            const name = cafe.name.toLowerCase();
            const defaultLat = cafe.latitude ?? (name.includes('blanc') ? 40.7465 : name.includes('velvet') ? 40.7246 : 40.7580);
            const defaultLng = cafe.longitude ?? (name.includes('blanc') ? -74.0014 : name.includes('velvet') ? -73.9996 : -73.9855);
            return {
                ...cafe,
                latitude: defaultLat,
                longitude: defaultLng
            };
        });
        setGoogleCafes(mappedDbCafes);
    };

    // Search query helper using new Place class static methods
    const searchPlaces = async (currentMap: any, category: string, textQuery?: string) => {
        if (!currentMap) return;
        const google = window.google;
        setIsSearchingPlaces(true);

        try {
            // Retrieve Place class dynamically
            let PlaceClass;
            if (google.maps.places && google.maps.places.Place) {
                PlaceClass = google.maps.places.Place;
            } else {
                const lib = await google.maps.importLibrary("places");
                PlaceClass = lib.Place;
            }

            const fields = [
                'id',
                'displayName',
                'formattedAddress',
                'rating',
                'userRatingCount',
                'priceLevel',
                'types',
                'photos',
                'location',
                'regularOpeningHours'
            ];

            let results: any[] = [];

            if (textQuery) {
                const request = {
                    textQuery: `coffee ${textQuery}`,
                    fields: fields,
                    locationBias: {
                        center: currentMap.getCenter(),
                        radius: 3000,
                    },
                };
                const response = await PlaceClass.searchByText(request);
                results = response.places || [];
            } else if (category === 'Wi-Fi' || category === 'Outdoor') {
                const textRequest = {
                    textQuery: category === 'Wi-Fi' ? 'coffee wifi' : 'coffee outdoor',
                    fields: fields,
                    locationBias: {
                        center: currentMap.getCenter(),
                        radius: 1500,
                    }
                };
                const response = await PlaceClass.searchByText(textRequest);
                results = response.places || [];
            } else {
                const request: any = {
                    fields: fields,
                    locationRestriction: {
                        center: currentMap.getCenter(),
                        radius: 1500,
                    },
                    includedPrimaryTypes: ['cafe']
                };
                const response = await PlaceClass.searchNearby(request);
                results = response.places || [];
            }

            setIsSearchingPlaces(false);

            if (results && results.length > 0) {
                const mappedCafes: Cafe[] = [];
                for (const result of results) {
                    const placeId = result.id;
                    if (!placeId) continue;

                    let resolvedId = placeId;
                    try {
                        resolvedId = await resolveUuidV5(placeId);
                    } catch (e) {
                        console.error('UUID v5 conversion error:', e);
                    }

                    const isSaved = cafes.some((c) => c.id === resolvedId && c.isSaved);

                    // Get photo URL safely
                    let heroImage = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800';
                    if (result.photos && result.photos.length > 0) {
                        const photo = result.photos[0];
                        if (typeof photo.getURI === 'function') {
                            heroImage = photo.getURI({ maxWidth: 600, maxHeight: 400 });
                        } else if (typeof photo.getUrl === 'function') {
                            heroImage = photo.getUrl({ maxWidth: 600, maxHeight: 400 });
                        }
                    }

                    const inspirationImages: string[] = [];
                    if (result.photos && result.photos.length > 1) {
                        result.photos.slice(1, 5).forEach((p: any) => {
                            if (typeof p.getURI === 'function') {
                                inspirationImages.push(p.getURI({ maxWidth: 400, maxHeight: 300 }));
                            } else if (typeof p.getUrl === 'function') {
                                inspirationImages.push(p.getUrl({ maxWidth: 400, maxHeight: 300 }));
                            }
                        });
                    }

                    // Price Level mapping
                    let priceLevel = '$$';
                    if (result.priceLevel) {
                        if (result.priceLevel.includes('FREE')) priceLevel = 'Free';
                        else if (result.priceLevel.includes('INEXPENSIVE')) priceLevel = '$';
                        else if (result.priceLevel.includes('MODERATE')) priceLevel = '$$';
                        else if (result.priceLevel.includes('EXPENSIVE')) priceLevel = '$$$';
                        else if (result.priceLevel.includes('VERY_EXPENSIVE')) priceLevel = '$$$$';
                    }

                    // Types / Tags mapping
                    const tags = ['Coffee'];
                    if (result.types) {
                        result.types.forEach((t: string) => {
                            if (t !== 'cafe' && t !== 'establishment' && t !== 'point_of_interest' && tags.length < 3) {
                                tags.push(t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
                            }
                        });
                    }

                    // Resolve coordinates safely
                    const lat = typeof result.location?.lat === 'function' ? result.location.lat() : result.location?.lat;
                    const lng = typeof result.location?.lng === 'function' ? result.location.lng() : result.location?.lng;

                    // Address mapping
                    const address = result.formattedAddress || '';

                    // Status mapping
                    let statusStr = 'Open';
                    if (result.regularOpeningHours) {
                        statusStr = result.regularOpeningHours.openNow ? 'Open Now' : 'Closed';
                    }

                    // Name mapping
                    const name = typeof result.displayName === 'string'
                        ? result.displayName
                        : (result.displayName?.text || result.name || 'Coffee Shop');

                    mappedCafes.push({
                        id: placeId,
                        name: name,
                        rating: result.rating || 4.5,
                        reviews: result.userRatingCount || 25,
                        priceLevel: priceLevel,
                        type: 'Coffee Shop',
                        address: address,
                        status: statusStr,
                        tags: tags,
                        heroImage: heroImage,
                        inspirationImages: inspirationImages,
                        isSaved: isSaved,
                        latitude: lat,
                        longitude: lng
                    });
                }

                // Apply categories filters
                let filteredCafes = mappedCafes;
                if (category === 'Open Now') {
                    filteredCafes = mappedCafes.filter(c => c.status === 'Open Now');
                } else if (category === 'Top Rated') {
                    filteredCafes.sort((a, b) => b.rating - a.rating);
                }

                setGoogleCafes(filteredCafes);
            } else {
                triggerDatabaseFallback();
            }
        } catch (error) {
            console.error("Google Places (New) API failed. Error:", error);
            setIsSearchingPlaces(false);
            triggerDatabaseFallback();
        }
    };

    // Trigger Places search when the map is initialized or active category changes
    useEffect(() => {
        if (!map) return;
        searchPlaces(map, activeCategory);
        setHasMoved(false);
    }, [map, activeCategory]);

    // 3. User manual interaction detectors: flag when map is manual moved/zoomed
    useEffect(() => {
        if (!map) return;
        const google = window.google;

        const dragListener = map.addListener('dragend', () => {
            setHasMoved(true);
        });

        const zoomListener = map.addListener('zoom_changed', () => {
            setHasMoved(true);
        });

        return () => {
            google.maps.event.removeListener(dragListener);
            google.maps.event.removeListener(zoomListener);
        };
    }, [map]);

    const handleRefresh = () => {
        if (map) {
            searchPlaces(map, activeCategory);
            setHasMoved(false);
        }
    };

    // Pan map to selected cafe when it changes
    useEffect(() => {
        if (!map || !selectedCafe) return;
        const coords = getCafeCoords(selectedCafe);
        map.panTo(coords);
    }, [map, selectedCafe]);

    // Draw Cafe Custom Markers using OverlayView
    useEffect(() => {
        if (!map || !googleCafes.length) return;

        const google = window.google;
        const activeOverlays: Array<{ id: string; container: HTMLDivElement; overlay: any }> = [];

        googleCafes.forEach((cafe) => {
            const coords = getCafeCoords(cafe);
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.transform = 'translate(-50%, -50%)';

            const overlay = new google.maps.OverlayView();
            overlay.onAdd = function () {
                const panes = this.getPanes();
                panes?.overlayMouseTarget.appendChild(container);
            };
            overlay.draw = function () {
                const projection = this.getProjection();
                if (!projection) return;
                const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(coords.lat, coords.lng));
                if (point) {
                    container.style.left = `${point.x}px`;
                    container.style.top = `${point.y}px`;
                }
            };
            overlay.onRemove = function () {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            };
            overlay.setMap(map);
            activeOverlays.push({ id: cafe.id, container, overlay });
        });

        setOverlays(activeOverlays.map(o => ({ id: o.id, container: o.container })));

        return () => {
            activeOverlays.forEach((o) => {
                o.overlay.setMap(null);
            });
            setOverlays([]);
        };
    }, [map, googleCafes]);

    // Draw User Location marker custom OverlayView
    useEffect(() => {
        if (!map || !userLocation) return;

        const google = window.google;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.transform = 'translate(-50%, -50%)';

        const overlay = new google.maps.OverlayView();
        overlay.onAdd = function () {
            const panes = this.getPanes();
            panes?.overlayMouseTarget.appendChild(container);
        };
        overlay.draw = function () {
            const projection = this.getProjection();
            if (!projection) return;
            const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(userLocation.lat, userLocation.lng));
            if (point) {
                container.style.left = `${point.x}px`;
                container.style.top = `${point.y}px`;
            }
        };
        overlay.onRemove = function () {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        };
        overlay.setMap(map);
        setUserOverlay({ container });

        return () => {
            overlay.setMap(null);
            setUserOverlay(null);
        };
    }, [map, userLocation]);

    const handleRecenter = () => {
        if (map) {
            if (userLocation) {
                map.panTo(userLocation);
                map.setZoom(15);
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setUserLocation(coords);
                        map.panTo(coords);
                        map.setZoom(15);
                    },
                    (err) => {
                        console.error('Recenter geolocation failed:', err);
                        map.panTo({ lat: 40.7465, lng: -74.0014 });
                        map.setZoom(14);
                    }
                );
            }
        }
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (map && searchQuery.trim()) {
            searchPlaces(map, activeCategory, searchQuery);
            setHasMoved(false);
        }
    };

    if (!mapsLoaded) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-slate-500 bg-[#f2ede4]">
                <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm">Loading map…</p>
            </div>
        );
    }


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative h-full"
        >
            {/* Top Controls Overlay */}
            <div className="absolute top-0 left-0 w-full z-10 p-4 pt-6">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                    <div className="flex-1 flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-primary/10 px-4 py-2">
                        <Search className="w-5 h-5 text-primary mr-2" />
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                            placeholder="Search coffee shops..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="hidden" />
                        <SlidersHorizontal className="w-5 h-5 text-slate-400" />
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-primary border border-primary/10 hover:bg-slate-50 active:scale-95 transition-all"
                        title="Refresh search"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleRecenter}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-primary border border-primary/10 hover:bg-slate-50 active:scale-95 transition-all"
                        title="Recenter on location"
                    >
                        <Navigation className="w-5 h-5 fill-primary" />
                    </button>
                </form>

                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1 transition-all ${
                                activeCategory === cat
                                    ? 'bg-primary text-white'
                                    : 'bg-white/90 text-slate-700 border border-primary/5'
                            }`}
                        >
                            {cat === 'Top Rated' && <Heart className="w-3 h-3 fill-white" />}
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-[#f2ede4]">
                {/* Map DOM Element */}
                <div ref={mapRef} className="absolute inset-0 w-full h-full" />

                {/* Search this area overlay button */}
                {hasMoved && (
                    <div className="absolute top-[125px] left-1/2 -translate-x-1/2 z-20">
                        <button
                            type="button"
                            onClick={() => {
                                if (map) {
                                    searchPlaces(map, activeCategory);
                                    setHasMoved(false);
                                }
                            }}
                            className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 border border-white/20 whitespace-nowrap"
                        >
                            <Search className="w-3.5 h-3.5" />
                            Search this area
                        </button>
                    </div>
                )}

                {/* React Portals for custom map marker elements */}
                {overlays.map(({ id, container }) => {
                    const cafe = googleCafes.find((c) => c.id === id);
                    if (!cafe) return null;
                    const isSelected = selectedCafe && selectedCafe.id === cafe.id;
                    const idx = googleCafes.indexOf(cafe);

                    return createPortal(
                        <div
                            onClick={() => setSelectedId(cafe.id)}
                            className="flex flex-col items-center cursor-pointer transition-all duration-300"
                        >
                            <div
                                className={`p-2 rounded-full shadow-xl transition-all ${
                                    isSelected
                                        ? 'bg-primary text-white ring-4 ring-primary/20 scale-110 animate-bounce'
                                        : 'bg-white text-primary border border-primary/20 opacity-80'
                                }`}
                            >
                                {idx === 1 ? (
                                    <Heart className="w-5 h-5 fill-primary" />
                                ) : (
                                    <MapPin className="w-5 h-5 fill-current" />
                                )}
                            </div>

                            {isSelected && (
                                <div className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 shadow-md whitespace-nowrap">
                                    {cafe.name.split(' ')[0]}
                                </div>
                            )}
                        </div>,
                        container
                    );
                })}

                {/* React Portal for User Location Marker dot */}
                {userLocation && userOverlay && createPortal(
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-45" />
                        <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg shadow-blue-500/40" />
                    </div>,
                    userOverlay.container
                )}
            </div>

            {/* Detail Card Overlay at Bottom */}
            {selectedCafe && (
                <div className="absolute bottom-[88px] left-0 w-full px-4">
                    <div className="bg-white rounded-xl shadow-2xl p-4 flex gap-4 items-center border border-primary/5">
                        <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                            <img
                                src={selectedCafe.heroImage}
                                className="w-full h-full object-cover"
                                alt={selectedCafe.name}
                                referrerPolicy="no-referrer"
                            />
                        </div>

                        <div className="flex-1 flex flex-col justify-between h-24 py-1">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg leading-tight truncate mr-2">{selectedCafe.name}</h3>
                                    <button
                                        onClick={() => onSaveCafe && onSaveCafe(selectedCafe.id, selectedCafe)}
                                        className="cursor-pointer active:scale-90 transition-transform p-1 rounded-full hover:bg-slate-100 shrink-0"
                                    >
                                        <Heart className={`w-5 h-5 ${selectedCafe.isSaved ? 'text-primary fill-primary' : 'text-slate-300'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 mt-0.5">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs font-bold">{selectedCafe.rating}</span>
                                    <span className="text-xs text-slate-400 ml-1">• {selectedCafe.address.split(',')[0]}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onSelectCafe(selectedCafe)}
                                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full flex-1 flex items-center justify-center gap-1 shadow-md shadow-primary/20 hover:opacity-90"
                                >
                                    View Details
                                    <ChevronLeft className="w-4 h-4 rotate-180" />
                                </button>

                                <button
                                    onClick={() => map?.panTo(getCafeCoords(selectedCafe))}
                                    className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20 transition-all active:scale-95"
                                >
                                    <Navigation className="w-4 h-4 fill-primary" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-2">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full opacity-50"></div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
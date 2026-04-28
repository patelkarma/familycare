import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Phone,
  Navigation,
  Crosshair,
  AlertTriangle,
  Home,
  Search,
  Save,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { pharmacyApi } from '../api/pharmacy.api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';

// ─── Marker styles ───────────────────────────────────────────────────────────

const pharmacyIcon = L.divIcon({
  className: 'pharmacy-marker',
  html: `<div style="background:#F5A623;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
           <span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:16px;">+</span>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
});

const homeIcon = L.divIcon({
  className: 'home-marker',
  html: `<div style="background:#10b981;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
           <span style="transform:rotate(45deg);color:white;font-size:14px;">⌂</span>
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -26],
});

// ─── Constants ───────────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India centroid
const HOME_KEY = 'familycare:homeLocation';

// India bounding box (roughly). Used to reject geocoded results that fall in
// the ocean or the wrong country.
const INDIA_BOUNDS = { latMin: 6, latMax: 37, lngMin: 68, lngMax: 97 };
const isInIndia = (loc) =>
  loc &&
  loc.lat >= INDIA_BOUNDS.latMin &&
  loc.lat <= INDIA_BOUNDS.latMax &&
  loc.lng >= INDIA_BOUNDS.lngMin &&
  loc.lng <= INDIA_BOUNDS.lngMax;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const loadHome = () => {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Drop any old saved home that's outside India (bad data from earlier).
    if (parsed && !isInIndia(parsed)) {
      localStorage.removeItem(HOME_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// Nominatim (OSM) free geocoder — no auth, ~1 req/sec rate limit.
// Restrict to India + bias the search with a viewbox so single-word queries
// don't match arbitrary world locations.
const geocode = async (q) => {
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '5',
    countrycodes: 'in',
    addressdetails: '0',
    // Viewbox = India bounding box. bounded=1 forces results to fall inside it.
    viewbox: '68,37,97,6',
    bounded: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('geocode failed');
  const arr = await res.json();
  if (!arr.length) return null;

  // Pick the first result that actually falls inside India (defensive).
  for (const item of arr) {
    const loc = {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name,
    };
    if (isInIndia(loc)) return loc;
  }
  return null;
};

const formatDistance = (m) => {
  if (m == null) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

// ─── Component ───────────────────────────────────────────────────────────────

const Pharmacy = () => {
  const { t } = useTranslation();
  const [home, setHome] = useState(loadHome);
  const [currentLoc, setCurrentLoc] = useState(null);
  const [mode, setMode] = useState(home ? 'home' : 'current'); // 'home' | 'current' | 'pin'
  const [pinned, setPinned] = useState(null); // ad-hoc clicked location
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radius, setRadius] = useState(2000);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(!home);
  const requestedGeoOnce = useRef(false);

  // Save / clear home helpers
  const saveHome = (loc) => {
    if (!loc) return;
    if (!isInIndia(loc)) {
      toast.error(
        `That location is outside India (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}). Please pick somewhere in India.`,
        { duration: 5000 }
      );
      return;
    }
    const labelled = { ...loc, label: loc.label || 'Home' };
    setHome(labelled);
    localStorage.setItem(HOME_KEY, JSON.stringify(labelled));
    setMode('home');
    toast.success(t('pharmacy.homeSaved'));
  };

  const clearHome = () => {
    setHome(null);
    localStorage.removeItem(HOME_KEY);
    if (mode === 'home') setMode('current');
    toast('Home location cleared', { icon: '🗑️' });
  };

  // Geolocation
  const fetchGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Current location',
        };
        setCurrentLoc(loc);
        setGeoError(null);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message || 'Unable to get your location.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Auto-fetch current location once if no home is set, OR on mount when mode is 'current'
  useEffect(() => {
    if (requestedGeoOnce.current) return;
    if (!home || mode === 'current') {
      requestedGeoOnce.current = true;
      fetchGeo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search address (geocode)
  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    if (q.length < 4) {
      toast.error(t('pharmacy.searchTooShort'));
      return;
    }
    setSearching(true);
    try {
      const loc = await geocode(q);
      if (!loc) {
        toast.error(
          `No matching place in India for "${q}". Try a full address with city and pincode.`,
          { duration: 5000 }
        );
        return;
      }
      setPinned(loc);
      setMode('pin');
      setShowSettings(true); // keep settings open so user can save it as home
      toast.success(`Found: ${loc.label.split(',').slice(0, 2).join(',')}`);
    } catch (e) {
      toast.error(t('pharmacy.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  // Active location (the one driving the search + map center)
  const active =
    mode === 'home' && home
      ? home
      : mode === 'current' && currentLoc
        ? currentLoc
        : mode === 'pin' && pinned
          ? pinned
          : null;

  const center = active || home || currentLoc || DEFAULT_CENTER;
  const initialZoom = active ? 14 : 5;

  // Pharmacy query
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['pharmacies', active?.lat, active?.lng, radius],
    queryFn: () =>
      pharmacyApi.getNearby({ lat: active.lat, lng: active.lng, radius }),
    enabled: !!active,
    staleTime: 10 * 60 * 1000,
  });

  const pharmacies = data?.data || [];

  // ─── UI ───

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pharmacy.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Find pharmacies around your home or current location
            </p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
              showSettings
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary'
            }`}
          >
            {showSettings ? 'Done' : 'Location settings'}
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Showing pharmacies near:</span>
          <button
            onClick={() => {
              if (!home) {
                setShowSettings(true);
                toast('Save a home location first', { icon: '🏠' });
                return;
              }
              setMode('home');
            }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              mode === 'home'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
            }`}
          >
            <Home className="w-3 h-3" />
            {home ? home.label.split(',')[0].slice(0, 24) : 'Home (not set)'}
          </button>
          <button
            onClick={() => {
              setMode('current');
              if (!currentLoc) fetchGeo();
            }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              mode === 'current'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            Current location
          </button>
          {mode === 'pin' && pinned && (
            <button
              onClick={() => setMode(home ? 'home' : 'current')}
              className="text-xs px-3 py-1.5 rounded-full font-medium bg-purple-500 text-white shadow-sm flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3" />
              Searched ({pinned.label.split(',')[0].slice(0, 18)})
              <X className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>

        {/* Radius pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Radius:</span>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  radius === opt.value
                    ? 'bg-primary text-white shadow shadow-primary/20'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
              {/* Search */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Search an address or city
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g. Andheri West Mumbai, or 110001"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!search.trim() || searching}
                    className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Tip: you can also tap directly on the map to drop a pin.
                </p>
              </div>

              {/* Home controls */}
              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-600" />
                  Home location
                </label>

                {home ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-900">
                      <p className="font-semibold">{home.label.split(',')[0]}</p>
                      <p className="text-emerald-700 mt-0.5 line-clamp-2">{home.label}</p>
                      <p className="text-[10px] text-emerald-600 mt-1">
                        {home.lat.toFixed(4)}, {home.lng.toFixed(4)}
                      </p>
                    </div>
                    <button
                      onClick={clearHome}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-2 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No home set. Save one below so the map opens here every time.
                  </p>
                )}

                {/* Save buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {currentLoc && (
                    <button
                      onClick={() => saveHome({ ...currentLoc, label: 'Home' })}
                      className="text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save current location as home
                    </button>
                  )}
                  {pinned && (
                    <button
                      onClick={() => saveHome(pinned)}
                      className="text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save searched/pinned location as home
                    </button>
                  )}
                  {!currentLoc && (
                    <button
                      onClick={fetchGeo}
                      disabled={geoLoading}
                      className="text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                      Detect my location
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geolocation error banner */}
      {geoError && mode === 'current' && (
        <motion.div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">{t('pharmacy.locationUnavailable')}</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {geoError} — try opening Location settings above to set a home location or search by address.
            </p>
          </div>
        </motion.div>
      )}

      {/* Empty state when no active location */}
      {!active && (
        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <EmptyState
            icon={MapPin}
            title="Where should we look?"
            description="Set a home location once, or use your current location. You can also search any city or address."
            actionLabel="Open settings"
            onAction={() => setShowSettings(true)}
          />
        </div>
      )}

      {/* Map */}
      {active && (
        <motion.div
          className="rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          style={{ height: '460px' }}
        >
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={initialZoom}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              eventHandlers={{
                tileerror: (e) => {
                  console.warn('[map] tile error', e?.tile?.src);
                },
                tileload: () => {
                  // log just once when first tile loads to confirm reachability
                  if (!window.__pharmacyTileLogged) {
                    window.__pharmacyTileLogged = true;
                    console.log('[map] tiles loading OK');
                  }
                },
              }}
            />
            <RecenterOnChange lat={active.lat} lng={active.lng} />

            <ClickHandler
              onPick={(loc) => {
                setPinned({ ...loc, label: `Pin at ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` });
                setMode('pin');
              }}
            />

            {/* Active marker */}
            {mode === 'home' && home && (
              <Marker position={[home.lat, home.lng]} icon={homeIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" /> Home
                    </p>
                    <p className="text-gray-600 text-xs mt-1">{home.label}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {mode === 'current' && currentLoc && (
              <CircleMarker
                center={[currentLoc.lat, currentLoc.lng]}
                radius={9}
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9 }}
              >
                <Popup>{t('pharmacy.youAreHere')}</Popup>
              </CircleMarker>
            )}
            {mode === 'pin' && pinned && (
              <CircleMarker
                center={[pinned.lat, pinned.lng]}
                radius={9}
                pathOptions={{ color: '#9333ea', fillColor: '#a855f7', fillOpacity: 0.9 }}
              >
                <Popup>{pinned.label}</Popup>
              </CircleMarker>
            )}

            {/* Pharmacy markers */}
            {pharmacies.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pharmacyIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    {p.address && <p className="text-gray-600 mt-1">{p.address}</p>}
                    {p.openingHours && (
                      <p className="text-gray-500 text-xs mt-1">{p.openingHours}</p>
                    )}
                    <p className="text-primary font-medium mt-1">
                      {formatDistance(p.distanceMeters)} away
                    </p>
                    <div className="flex gap-2 mt-2">
                      {p.phone && (
                        <a
                          href={`tel:${p.phone}`}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium"
                        >
                          Call
                        </a>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-primary-light text-primary px-2 py-1 rounded-full font-medium"
                      >
                        Directions
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </motion.div>
      )}

      {/* Confirmation when home active */}
      {active && mode === 'home' && (
        <p className="text-xs text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Showing pharmacies near your saved home location.
        </p>
      )}

      {/* List */}
      <div>
        {(geoLoading && !currentLoc) || isLoading ? (
          <LoadingSpinner text="Finding pharmacies nearby..." />
        ) : null}

        {active && !isLoading && pharmacies.length === 0 && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  No pharmacies in OpenStreetMap for this area
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Our data comes from OpenStreetMap, which relies on community-contributed
                  pins. Smaller towns in India often have gaps. Two options below:
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 ml-8">
              <a
                href={`https://www.google.com/maps/search/pharmacy/@${active.lat},${active.lng},14z`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg px-3 py-2 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Search Google Maps for pharmacies near here
              </a>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-semibold text-xs rounded-lg px-3 py-2 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Try a different location
              </button>
            </div>
            <p className="text-[11px] text-amber-700 mt-3 ml-8 italic">
              Tip: try searching "Ahmedabad" or "Mumbai BKC" to see how the map looks with
              well-mapped areas. For your actual home, Google Maps has the most complete coverage.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Could not load pharmacies. {error.message}
            <button onClick={() => refetch()} className="ml-2 underline font-medium">
              Retry
            </button>
          </div>
        )}

        {pharmacies.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
          >
            {pharmacies.map((p) => (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                    <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                      {formatDistance(p.distanceMeters)}
                    </span>
                  </div>
                  {p.address && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.address}</p>
                  )}
                  {p.openingHours && (
                    <p className="text-xs text-gray-400 mt-1">{p.openingHours}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium hover:bg-green-100 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {p.phone}
                      </a>
                    )}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Directions
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {isFetching && !isLoading && (
          <p className="text-center text-xs text-gray-400 mt-4">Refreshing…</p>
        )}
      </div>
    </div>
  );
};

export default Pharmacy;

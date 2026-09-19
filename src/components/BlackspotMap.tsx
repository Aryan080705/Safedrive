import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  ShieldAlert,
  Filter,
  Compass,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Database,
  RefreshCw
} from 'lucide-react';
import type {
  BlackspotPoint,
  BlackspotCluster,
  AccidentSeverity
} from '../types';
import {
  SAMPLE_BLACKSPOT_POINTS,
  computeBlackspotClusters,
  getBlackspotSummary,
  findNearestBlackspots,
  generateLocalDemoIncidents,
  DEMO_DATASET_LOCATION,
  DATASET_COVERAGE_RADIUS_KM,
  haversineDistanceKm,
  type NearestBlackspot
} from '../services/blackspotData';

// Fix standard Leaflet default marker icon paths in Vite
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Cache for reverse geocoding to respect OSM Nominatim rate limits
const reverseGeocodeCache = new Map<string, string>();

export const BlackspotMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const hasCenteredGPSRef = useRef(false);

  // Data mode: 'LIVE_GPS_DEMO_RISK' or 'HISTORICAL_DATASET'
  const [dataMode, setDataMode] = useState<'LIVE_GPS_DEMO_RISK' | 'HISTORICAL_DATASET'>('LIVE_GPS_DEMO_RISK');

  // Live GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'REQUESTING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT'>('REQUESTING');
  const [areaName, setAreaName] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Procedurally generated synthetic demo risk points around user's GPS
  const [localDemoPoints, setLocalDemoPoints] = useState<BlackspotPoint[]>([]);

  // Filters & Map Selection
  const [severityFilter, setSeverityFilter] = useState<AccidentSeverity | 'ALL'>('ALL');
  const [selectedCluster, setSelectedCluster] = useState<BlackspotCluster | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<BlackspotPoint | null>(null);
  const [showClusters, setShowClusters] = useState(true);
  const [showPoints, setShowPoints] = useState(true);

  // Active points based on dataMode
  const rawActivePoints = useMemo<BlackspotPoint[]>(() => {
    if (dataMode === 'LIVE_GPS_DEMO_RISK') {
      if (localDemoPoints.length > 0) return localDemoPoints;
      if (userCoords) return generateLocalDemoIncidents(userCoords.lat, userCoords.lng);
      return [];
    }
    return SAMPLE_BLACKSPOT_POINTS;
  }, [dataMode, localDemoPoints, userCoords]);

  // Compute real DBSCAN clusters dynamically from active points
  const activeClusters = useMemo<BlackspotCluster[]>(() => {
    return computeBlackspotClusters(rawActivePoints);
  }, [rawActivePoints]);

  // Summary statistics for active dataset
  const summary = useMemo(
    () => getBlackspotSummary(activeClusters, rawActivePoints),
    [activeClusters, rawActivePoints]
  );

  // Active reference coordinates (User's location if available, else dataset location)
  const activeLocation = useMemo(() => {
    if (userCoords) {
      return { lat: userCoords.lat, lng: userCoords.lng, isLive: true };
    }
    return { lat: DEMO_DATASET_LOCATION.lat, lng: DEMO_DATASET_LOCATION.lng, isLive: false };
  }, [userCoords]);

  // Calculate nearest clusters to active location
  const nearestBlackspots = useMemo<NearestBlackspot[]>(() => {
    return findNearestBlackspots(activeLocation.lat, activeLocation.lng, activeClusters, 3);
  }, [activeLocation, activeClusters]);

  // Check whether active location is within historical dataset coverage (only relevant for HISTORICAL_DATASET)
  const isWithinCoverage = useMemo(() => {
    if (dataMode === 'LIVE_GPS_DEMO_RISK') return true;
    if (!nearestBlackspots.length) return false;
    return nearestBlackspots[0].distanceKm <= DATASET_COVERAGE_RADIUS_KM;
  }, [dataMode, nearestBlackspots]);

  // Filtered accident points by severity
  const filteredPoints = useMemo(() => {
    return rawActivePoints.filter((pt) => {
      if (severityFilter !== 'ALL' && pt.severity !== severityFilter) return false;
      return true;
    });
  }, [rawActivePoints, severityFilter]);

  // Derived casualty and severity breakdowns for summary cards
  const fatalCount = useMemo(() => rawActivePoints.filter((p) => p.severity === 'FATAL').length, [rawActivePoints]);
  const severeCount = useMemo(() => rawActivePoints.filter((p) => p.severity === 'SEVERE').length, [rawActivePoints]);
  const criticalCount = useMemo(() => activeClusters.filter((c) => c.riskIntensity === 'CRITICAL').length, [activeClusters]);

  // Reverse Geocoding via OSM Nominatim (with graceful failure fallback)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      setAreaName(reverseGeocodeCache.get(cacheKey)!);
      return;
    }

    setIsGeocoding(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        const local =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.city_district ||
          addr.town ||
          addr.city ||
          addr.village ||
          addr.county;
        const region = addr.state || addr.country;

        let formatted = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
        if (local && region) {
          formatted = `${local}, ${region}`;
        } else if (local || region) {
          formatted = local || region;
        }

        reverseGeocodeCache.set(cacheKey, formatted);
        setAreaName(formatted);
      } else {
        setAreaName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
      }
    } catch {
      // Fallback cleanly to coordinate string on network error or timeout
      setAreaName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Request browser GPS position
  const requestCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    setGpsStatus('REQUESTING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setUserCoords({ lat, lng });
        setAccuracyMeters(acc);
        setGpsStatus('GRANTED');
        setLocalDemoPoints((prev) => (prev.length > 0 ? prev : generateLocalDemoIncidents(lat, lng)));

        // Center map once on user's location without resetting constantly
        if (mapInstanceRef.current && dataMode === 'LIVE_GPS_DEMO_RISK' && !hasCenteredGPSRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.0 });
          hasCenteredGPSRef.current = true;
        }

        // Fetch area name
        reverseGeocode(lat, lng);
      },
      (err) => {
        console.warn('Blackspot Geolocation error:', err.message);
        if (err.code === 1) {
          setGpsStatus('DENIED');
        } else if (err.code === 3) {
          setGpsStatus('TIMEOUT');
        } else {
          setGpsStatus('UNAVAILABLE');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [dataMode, reverseGeocode]);

  // Fallback demo location (Gurugram Tech Corridor) when GPS is denied or unavailable
  const handleUseDemoLocation = useCallback(() => {
    const demoLat = DEMO_DATASET_LOCATION.lat;
    const demoLng = DEMO_DATASET_LOCATION.lng;
    setUserCoords({ lat: demoLat, lng: demoLng });
    setAccuracyMeters(18);
    setGpsStatus('GRANTED');
    setAreaName('NH-48 Cyber City, Gurugram (Demo GPS)');
    const pts = generateLocalDemoIncidents(demoLat, demoLng);
    setLocalDemoPoints(pts);
    setDataMode('LIVE_GPS_DEMO_RISK');
    hasCenteredGPSRef.current = true;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([demoLat, demoLng], 14, { duration: 0.8 });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map without hardcoding Gurgaon
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629], // Neutral center before GPS resolves
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: true,
      });

      // Free OpenStreetMap tile layer (zero tokens, zero billing)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      clusterLayerRef.current = L.layerGroup().addTo(map);
      userLocationLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Immediately request live location on mount
      requestCurrentPosition();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [requestCurrentPosition]);

  // Generate / Regenerate synthetic demo risk incidents around user's GPS
  const handleGenerateDemoRisk = useCallback(() => {
    if (userCoords) {
      const pts = generateLocalDemoIncidents(userCoords.lat, userCoords.lng);
      setLocalDemoPoints(pts);
      setDataMode('LIVE_GPS_DEMO_RISK');
      setSelectedCluster(null);
      setSelectedPoint(null);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.8 });
      }
    } else {
      requestCurrentPosition();
    }
  }, [userCoords, requestCurrentPosition]);

  // Switch to Historical Dataset mode (NH-48 Gurugram Corridor)
  const handleSwitchToHistorical = useCallback(() => {
    setDataMode('HISTORICAL_DATASET');
    setSelectedCluster(null);
    setSelectedPoint(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([DEMO_DATASET_LOCATION.lat, DEMO_DATASET_LOCATION.lng], 13, {
        duration: 1.0,
      });
    }
  }, []);

  // Switch to Live GPS + Demo Risk mode
  const handleSwitchToLiveGps = useCallback(() => {
    setDataMode('LIVE_GPS_DEMO_RISK');
    setSelectedCluster(null);
    setSelectedPoint(null);
    if (userCoords) {
      if (localDemoPoints.length === 0) {
        setLocalDemoPoints(generateLocalDemoIncidents(userCoords.lat, userCoords.lng));
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.8 });
      }
    } else {
      requestCurrentPosition();
    }
  }, [userCoords, localDemoPoints.length, requestCurrentPosition]);

  // Recenter map on user's GPS coordinates
  const handleRecenterOnMe = useCallback(() => {
    if (userCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 15, { duration: 0.8 });
    } else {
      requestCurrentPosition();
    }
  }, [userCoords, requestCurrentPosition]);

  // Fit bounds to all active risk zones + user
  const handleFitRiskZones = useCallback(() => {
    if (!mapInstanceRef.current || !activeClusters.length) return;
    const bounds = L.latLngBounds(activeClusters.map((c) => [c.centerLat, c.centerLng]));
    if (userCoords) {
      bounds.extend([userCoords.lat, userCoords.lng]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [activeClusters, userCoords]);

  // Pan to historical dataset cluster zone (Gurugram NH-48)
  const handleViewDatasetArea = useCallback(() => {
    setDataMode('HISTORICAL_DATASET');
    setSelectedCluster(null);
    setSelectedPoint(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([DEMO_DATASET_LOCATION.lat, DEMO_DATASET_LOCATION.lng], 13, {
        duration: 1.0,
      });
    }
  }, []);

  // Render "You Are Here" marker and accuracy halo
  useEffect(() => {
    const layers = userLocationLayerRef.current;
    if (!layers) return;

    layers.clearLayers();

    if (userCoords) {
      // 1. Accuracy circle
      if (accuracyMeters && accuracyMeters > 0) {
        const accuracyCircle = L.circle([userCoords.lat, userCoords.lng], {
          radius: Math.min(accuracyMeters, 500),
          color: '#B8892D',
          weight: 1.5,
          fillColor: '#B8892D',
          fillOpacity: 0.15,
          dashArray: '4, 4',
        });
        accuracyCircle.bindTooltip(`GPS Accuracy: &plusmn;${accuracyMeters}m`, { sticky: true });
        layers.addLayer(accuracyCircle);
      }

      // 2. Pulse "You Are Here" Marker using Custom DivIcon
      const userIcon = L.divIcon({
        className: 'custom-user-location-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px;">
            <div style="position: absolute; inset: -6px; border-radius: 9999px; background: rgba(184, 137, 45, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 22px; height: 22px; border-radius: 9999px; background: #B8892D; border: 3px solid #0C0F0A; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 9999px; background: #0C0F0A;"></div>
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
      userMarker.bindTooltip(
        `<strong>📍 YOU ARE HERE</strong><br/>Lat: ${userCoords.lat.toFixed(5)}, Lng: ${userCoords.lng.toFixed(5)}<br/>Accuracy: &plusmn;${accuracyMeters || 'N/A'}m`,
        { permanent: false, sticky: true }
      );
      layers.addLayer(userMarker);
    }

    // When examining historical dataset, also display reference dataset pin at NH-48
    if (dataMode === 'HISTORICAL_DATASET') {
      const demoIcon = L.divIcon({
        className: 'custom-demo-location-marker',
        html: `
          <div style="width: 20px; height: 20px; border-radius: 9999px; background: #B8892D; border: 3px solid #F5EFE3; box-shadow: 0 4px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
            <div style="width: 5px; height: 5px; border-radius: 9999px; background: #F5EFE3;"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const demoMarker = L.marker([DEMO_DATASET_LOCATION.lat, DEMO_DATASET_LOCATION.lng], { icon: demoIcon });
      demoMarker.bindTooltip(
        `<strong>📍 NH-48 DATASET REGION</strong><br/>${DEMO_DATASET_LOCATION.name}`,
        { sticky: true }
      );
      layers.addLayer(demoMarker);
    }
  }, [dataMode, userCoords, accuracyMeters]);

  // Render Accident Points & DBSCAN Clusters
  useEffect(() => {
    const layers = clusterLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layers || !map) return;

    layers.clearLayers();

    // 1. Clusters (circles with bounded radius 120-360m)
    if (showClusters) {
      activeClusters.forEach((cluster) => {
        const isSelected = selectedCluster?.id === cluster.id;
        const boundedRadius = Math.min(Math.max(cluster.radiusMeters || 180, 120), 360);
        const color =
          cluster.riskIntensity === 'CRITICAL'
            ? '#D94B45'
            : cluster.riskIntensity === 'HIGH'
            ? '#B8892D'
            : '#D8C9A8';

        const circle = L.circle([cluster.centerLat, cluster.centerLng], {
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.2,
          radius: boundedRadius,
          weight: isSelected ? 3 : 1.5,
          dashArray: isSelected ? undefined : '4, 4',
        });

        // Compute distance from user
        const distToUser = haversineDistanceKm(
          activeLocation.lat,
          activeLocation.lng,
          cluster.centerLat,
          cluster.centerLng
        );

        const isDemo = cluster.source === 'DEMO_SIMULATED';
        circle.bindTooltip(
          `<strong>${isDemo ? '⭕ DEMO HOTSPOT: ' : '⚠️ '}${cluster.name}</strong><br/>` +
          `${cluster.totalIncidents} Incidents &middot; ${cluster.fatalCount} Fatal &middot; ${cluster.severeCount} Severe<br/>` +
          `<span style="color:#38bdf8;">${distToUser.toFixed(1)} km from ${activeLocation.isLive ? 'you' : 'dataset center'}</span>` +
          `${isDemo ? '<br/><span style="color:#f59e0b;font-size:10px;font-weight:bold;">[DEMO_SIMULATED] Real DBSCAN Cluster</span>' : '<br/><span style="color:#a855f7;font-size:10px;font-weight:bold;">[HISTORICAL_DATASET] NH-48 Corridor</span>'}`,
          { sticky: true }
        );

        circle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 190px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">${cluster.name}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
              <span style="background: ${cluster.riskIntensity === 'CRITICAL' ? '#fee2e2; color: #991b1b' : cluster.riskIntensity === 'HIGH' ? '#fef3c7; color: #92400e' : '#dbeafe; color: #1e40af'}; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${cluster.riskIntensity} RISK</span>
              <span style="color: #64748b; font-size: 11px;">Radius: ~${boundedRadius}m</span>
            </div>
            <div style="color: #334155; font-size: 11px; margin-bottom: 4px;">
              <strong>${cluster.totalIncidents}</strong> incidents (${cluster.fatalCount} fatal, ${cluster.severeCount} severe)
            </div>
            <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
              Distance: <strong>${distToUser.toFixed(1)} km</strong> from ${activeLocation.isLive ? 'your location' : 'dataset center'}
            </div>
            <div style="font-size: 10px; color: ${isDemo ? '#d97706' : '#7c3aed'}; font-weight: 600; padding-top: 4px; border-top: 1px solid #e2e8f0;">
              ${isDemo ? '⚠ [DEMO_SIMULATED] DBSCAN Spatial Cluster' : '✓ [HISTORICAL_DATASET] NH-48 Gurugram Corridor'}
            </div>
          </div>
        `);

        circle.on('click', () => {
          setSelectedCluster(cluster);
          setSelectedPoint(null);
          map.flyTo([cluster.centerLat, cluster.centerLng], 14, { duration: 0.8 });
        });

        layers.addLayer(circle);
      });
    }

    // 2. Individual Accident Points (small clean dots with detailed popups)
    if (showPoints) {
      filteredPoints.forEach((pt) => {
        const isSelected = selectedPoint?.id === pt.id;
        const color =
          pt.severity === 'FATAL'
            ? '#EA5455'
            : pt.severity === 'SEVERE'
            ? '#F07B3F'
            : '#FFD460';

        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: isSelected ? 7 : 4.5,
          color: '#ffffff',
          weight: isSelected ? 2 : 1,
          fillColor: color,
          fillOpacity: 0.9,
        });

        const isDemo = pt.source === 'DEMO_SIMULATED';
        marker.bindTooltip(
          `<strong>${isDemo ? '🔴 DEMO INCIDENT: ' : ''}${pt.locationName}</strong><br/>` +
          `Severity: ${pt.severity} &middot; ${pt.accidentType}` +
          `${isDemo ? '<br/><span style="color:#f59e0b;font-size:10px;">[DEMO_SIMULATED] Synthetic Incident</span>' : ''}`,
          { sticky: true }
        );

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 180px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px;">${pt.locationName}</div>
            <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
              <span style="background: ${pt.severity === 'FATAL' ? '#fee2e2; color: #991b1b' : pt.severity === 'SEVERE' ? '#fef3c7; color: #92400e' : '#dbeafe; color: #1e40af'}; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${pt.severity}</span>
              <span style="color: #64748b; font-size: 11px;">${pt.accidentType}</span>
            </div>
            <div style="color: #475569; font-size: 11px;">Road: ${pt.roadType} &bull; Weather: ${pt.weatherCondition}</div>
            <div style="font-size: 10px; color: ${isDemo ? '#d97706' : '#7c3aed'}; font-weight: 600; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
              ${isDemo ? '[DEMO_SIMULATED]' : '[NH-48 HISTORICAL]'}
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedPoint(pt);
          const parent = activeClusters.find((c) => c.points.some((p) => p.id === pt.id));
          if (parent) setSelectedCluster(parent);
          map.flyTo([pt.lat, pt.lng], 15, { duration: 0.8 });
        });

        layers.addLayer(marker);
      });
    }
  }, [activeClusters, filteredPoints, showClusters, showPoints, selectedCluster, selectedPoint, activeLocation, dataMode]);

  return (
    <div className="space-y-4">
      {/* Top Banner: Location-Aware Status Bar */}
      <div className="hud-card p-4 border border-white/10 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EA5455]/20 border border-[#EA5455]/40 flex items-center justify-center text-[#EA5455] shrink-0 mt-0.5 shadow-sm">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-[#F7F4EC] uppercase tracking-wider m-0">
                BLACKSPOT RISK INTELLIGENCE
              </h2>

              {/* Mode Badge */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono border ${
                  dataMode === 'LIVE_GPS_DEMO_RISK'
                    ? 'bg-[#FFD460]/20 text-[#FFD460] border-[#FFD460]/40'
                    : 'bg-[#F07B3F]/20 text-[#F07B3F] border-[#F07B3F]/40'
                }`}
              >
                {dataMode === 'LIVE_GPS_DEMO_RISK' ? 'LIVE GPS + DEMO RISK' : 'HISTORICAL DATASET'}
              </span>

              {/* Dataset Description Label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#2D4059] text-[#B9C0C8] border border-white/10">
                {dataMode === 'LIVE_GPS_DEMO_RISK'
                  ? 'Dynamic Client-Side DBSCAN Simulation'
                  : 'NH-48 Corridor (Verified Ground-Truth)'}
              </span>
            </div>

            {/* Location & Accuracy readout */}
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-xs text-[#B9C0C8] font-mono">
              <div className="flex items-center gap-1.5 text-[#FFD460] font-semibold">
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  YOUR LOCATION: <strong>{areaName || (isGeocoding ? 'Resolving area name...' : userCoords ? `${userCoords.lat.toFixed(4)}°N, ${userCoords.lng.toFixed(4)}°E` : 'Locating user...')}</strong>
                </span>
              </div>

              {userCoords && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="text-[#7F8995]">
                    {userCoords.lat.toFixed(4)}°N, {userCoords.lng.toFixed(4)}°E
                  </span>
                  {accuracyMeters !== null && (
                    <span className="text-[#4DBB82] font-bold bg-[#4DBB82]/10 px-1.5 py-0.5 rounded border border-[#4DBB82]/30">
                      (&plusmn;{accuracyMeters}m)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center bg-[#101820] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={handleSwitchToLiveGps}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                dataMode === 'LIVE_GPS_DEMO_RISK'
                  ? 'bg-[#2D4059] text-[#FFD460] font-bold shadow-sm'
                  : 'text-[#7F8995] hover:text-[#F7F4EC]'
              }`}
              title="Center on your GPS and generate demo risk incidents"
            >
              <Navigation className="w-3 h-3" />
              <span>Live GPS</span>
            </button>

            <button
              onClick={handleSwitchToHistorical}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                dataMode === 'HISTORICAL_DATASET'
                  ? 'bg-[#2D4059] text-[#FFD460] font-bold shadow-sm'
                  : 'text-[#7F8995] hover:text-[#F7F4EC]'
              }`}
              title="Inspect historical Gurugram NH-48 accident dataset"
            >
              <Database className="w-3 h-3" />
              <span>Historical NH-48</span>
            </button>
          </div>

          <button
            onClick={handleFitRiskZones}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#223247] hover:bg-[#2D4059] text-[#F7F4EC] border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            title="Fit map viewport to encompass all detected risk zones"
          >
            <Compass className="w-3.5 h-3.5 text-[#FFD460]" />
            <span>Fit Risk Zones</span>
          </button>

          <button
            onClick={handleRecenterOnMe}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#223247] hover:bg-[#2D4059] text-[#F7F4EC] border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            title="Recenter map on your current GPS coordinates"
          >
            <Navigation className="w-3.5 h-3.5 text-[#FFD460]" />
            <span>Recenter on Me</span>
          </button>

          {dataMode === 'LIVE_GPS_DEMO_RISK' ? (
            <button
              onClick={handleGenerateDemoRisk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFD460] hover:bg-[#FFE48A] text-[#101820] border border-[#FFD460] text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Generate fresh synthetic incidents around current GPS location"
            >
              <Zap className="w-3.5 h-3.5 text-[#101820]" />
              <span>Generate Demo Incidents</span>
            </button>
          ) : (
            <button
              onClick={handleViewDatasetArea}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Fly to historical NH-48 Gurugram dataset clusters"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View NH-48</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Top Summary Cards (calculated dynamically) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: LIVE DISTANCE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">LIVE DISTANCE</div>
            <div className="text-xl font-black text-white font-mono leading-tight">
              {nearestBlackspots.length > 0 ? `${nearestBlackspots[0].distanceKm} km` : 'N/A'}
            </div>
            <div className="text-[10px] text-cyan-400/90 truncate">
              {nearestBlackspots.length > 0 ? `To ${nearestBlackspots[0].cluster.name}` : 'Scanning area'}
            </div>
          </div>
        </div>

        {/* Card 2: ACTIVE HOTSPOTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ACTIVE HOTSPOTS</div>
            <div className="text-xl font-black text-amber-300 font-mono leading-tight">
              {summary.totalClusters} <span className="text-xs font-normal text-slate-400">clusters</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {dataMode === 'LIVE_GPS_DEMO_RISK' ? 'Real DBSCAN Algorithm' : 'Ground-truth corridors'}
            </div>
          </div>
        </div>

        {/* Card 3: INCIDENTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">INCIDENTS</div>
            <div className="text-xl font-black text-blue-300 font-mono leading-tight">
              {summary.totalIncidents} <span className="text-xs font-normal text-slate-400">records</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {fatalCount} fatal &bull; {severeCount} severe
            </div>
          </div>
        </div>

        {/* Card 4: HIGH-RISK ZONES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">HIGH-RISK ZONES</div>
            <div className="text-xl font-black text-rose-400 font-mono leading-tight">
              {summary.highRiskHotspots} <span className="text-xs font-normal text-slate-400">zones</span>
            </div>
            <div className="text-[10px] text-rose-300/80 truncate">
              {criticalCount} critical priority
            </div>
          </div>
        </div>
      </div>

      {/* Permission Denied / Error Notice with USE DEMO LOCATION button */}
      {(gpsStatus === 'DENIED' || gpsStatus === 'UNAVAILABLE' || gpsStatus === 'TIMEOUT') && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>LOCATION UNAVAILABLE:</strong> Browser GPS permission was denied or timed out.
              SafeDrive never fabricates fake user positions. You can load a demo location or explore the historical NH-48 dataset.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUseDemoLocation}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>USE DEMO LOCATION</span>
            </button>
            <button
              onClick={handleSwitchToHistorical}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-sm"
            >
              Inspect Historical NH-48
            </button>
          </div>
        </div>
      )}

      {/* Informational Banner: In-Browser Demo Simulation */}
      {dataMode === 'LIVE_GPS_DEMO_RISK' && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>In-Browser Spatial Risk Simulation Active</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  Real DBSCAN Algorithm
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Displaying {rawActivePoints.length} synthetic incident records dynamically scattered within 2.5 km of your verified GPS position.
                Clusters are computed in real-time by client-side DBSCAN clustering. All records are tagged <code className="text-amber-300">[DEMO_SIMULATED]</code>.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateDemoRisk}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Generate Risk</span>
          </button>
        </div>
      )}

      {/* Scientific Honesty Notice: Out-of-Coverage Notice in Historical Dataset Mode */}
      {dataMode === 'HISTORICAL_DATASET' && userCoords && !isWithinCoverage && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">
                Live Location Verified Outside Historical Dataset Area
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Loaded historical dataset contains 35 verified collision records for the <strong>NH-48 Corridor (Gurugram, Haryana)</strong>.
                No historical records exist near your live location in this static package. SafeDrive never moves distant accident data to your coordinates.
                To view simulated risk around your live coordinates, switch to <strong>Live GPS + Demo Risk</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSwitchToLiveGps}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Switch to Demo Risk</span>
            </button>
            <button
              onClick={handleViewDatasetArea}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded text-xs transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View NH-48</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Map & Controls + Nearest Hotspots Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Interactive Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-semibold uppercase text-[11px]">Severity:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                {(['ALL', 'FATAL', 'SEVERE', 'MINOR'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      severityFilter === sev
                        ? sev === 'FATAL'
                          ? 'bg-rose-600 text-white font-bold'
                          : sev === 'SEVERE'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={showClusters}
                  onChange={(e) => setShowClusters(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Clusters ({activeClusters.length})</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={showPoints}
                  onChange={(e) => setShowPoints(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Points ({filteredPoints.length})</span>
              </label>
            </div>
          </div>

          {/* Leaflet Map Viewport Container */}
          <div className="relative w-full h-[520px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-[11px] space-y-1.5 pointer-events-auto shadow-lg">
              <div className="text-[10px] uppercase font-bold text-slate-400">Map Legend</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                <span className="text-slate-200 font-semibold">🔵 You Are Here</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-400" />
                <span className="text-slate-300">High / Critical Hotspot (120-360m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-400" />
                <span className="text-slate-300">Moderate Risk Hotspot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500/40 border border-blue-400" />
                <span className="text-slate-300">Low / Minor Hotspot</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">Fatal</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-1" />
                <span className="text-slate-300">Severe</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-1" />
                <span className="text-slate-300">Minor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Nearest Risk Zones & Hotspot Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* Card 1: Nearest Risk Zones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 m-0">
                  Nearest Risk Zones
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {dataMode === 'LIVE_GPS_DEMO_RISK' ? 'Simulated Around You' : 'Historical NH-48'}
              </span>
            </div>

            {isWithinCoverage ? (
              <div className="space-y-2">
                {nearestBlackspots.map(({ cluster, distanceKm }, idx) => {
                  const rankNum = (idx + 1).toString().padStart(2, '0');
                  const isSelected = selectedCluster?.id === cluster.id;
                  const badgeColor =
                    cluster.riskIntensity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : cluster.riskIntensity === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

                  return (
                    <div
                      key={cluster.id}
                      onClick={() => {
                        setSelectedCluster(cluster);
                        setSelectedPoint(null);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo([cluster.centerLat, cluster.centerLng], 14);
                        }
                      }}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            #{rankNum}
                          </span>
                          <span className="font-bold text-white truncate max-w-[160px]">
                            {cluster.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400 shrink-0 ml-2">
                          {distanceKm} km
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400 font-mono">
                        <span className="text-slate-300">
                          <strong>{cluster.totalIncidents}</strong> incidents ({cluster.fatalCount} fatal)
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {cluster.riskIntensity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Outside Historical Dataset Area</span>
                </div>
                <p className="text-[11px] leading-relaxed m-0">
                  No historical accident records available near your current location in this static package.
                  The nearest recorded hotspot in the NH-48 dataset is <strong>{nearestBlackspots[0]?.distanceKm || 0} km</strong> away.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSwitchToLiveGps}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Switch to Demo Risk around you</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Selected Hotspot Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 m-0">
                    Hotspot Inspector
                  </h3>
                </div>
                {selectedCluster && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      selectedCluster.riskIntensity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedCluster.riskIntensity === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {selectedCluster.riskIntensity}
                  </span>
                )}
              </div>

              {selectedCluster ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                          #{selectedCluster.clusterNumber.toString().padStart(2, '0')}
                        </span>
                        <h4 className="text-sm font-bold text-white m-0">
                          {selectedCluster.name}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          selectedCluster.riskIntensity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : selectedCluster.riskIntensity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {selectedCluster.riskIntensity} RISK
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-mono flex-wrap">
                      <span>Centroid: {selectedCluster.centerLat.toFixed(4)}°N, {selectedCluster.centerLng.toFixed(4)}°E</span>
                      <span>&bull;</span>
                      <span>Radius: ~{Math.min(Math.max(selectedCluster.radiusMeters || 180, 120), 360)}m</span>
                      {userCoords && (
                        <>
                          <span>&bull;</span>
                          <span className="text-cyan-400 font-bold">
                            {haversineDistanceKm(userCoords.lat, userCoords.lng, selectedCluster.centerLat, selectedCluster.centerLng).toFixed(2)} km from your location
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Explicit Origin Badge / Interpretation Quote */}
                  <div
                    className={`p-2.5 rounded-lg border text-xs font-semibold ${
                      selectedCluster.source === 'DEMO_SIMULATED'
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : 'bg-[#182536] border-[#2D4059] text-[#F7F4EC]'
                    }`}
                  >
                    {selectedCluster.source === 'DEMO_SIMULATED'
                      ? '⚠ "Simulated high-density risk zone for prototype demonstration [DEMO / SIMULATED]."'
                      : '✓ "Historical accident dataset record (NH-48 Gurugram Corridor) [HISTORICAL_DATASET]."'}
                  </div>

                  {/* Casualty Breakdown (Total, Fatal, Severe, Minor) */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="text-[9px] uppercase text-slate-400">Total</div>
                      <div className="font-bold text-slate-100 text-sm mt-0.5">
                        {selectedCluster.totalIncidents}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-rose-900/40">
                      <div className="text-[9px] uppercase text-rose-400">Fatal</div>
                      <div className="font-bold text-rose-400 text-sm mt-0.5">
                        {selectedCluster.fatalCount}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-amber-900/40">
                      <div className="text-[9px] uppercase text-amber-400">Severe</div>
                      <div className="font-bold text-amber-400 text-sm mt-0.5">
                        {selectedCluster.severeCount}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-blue-900/40">
                      <div className="text-[9px] uppercase text-blue-400">Minor</div>
                      <div className="font-bold text-blue-400 text-sm mt-0.5">
                        {selectedCluster.minorCount}
                      </div>
                    </div>
                  </div>

                  {/* Incident Types Involved */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Incident Types Involved
                    </span>
                    <p className="text-xs text-slate-200 m-0 font-medium">
                      {Array.from(
                        new Set(
                          selectedCluster.points.map((p) => p.accidentType || 'Vehicle collision')
                        )
                      ).join(' • ') || 'Multi-vehicle collision, pedestrian conflict'}
                    </p>
                  </div>

                  {/* Dominant Risk / Primary Cause */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Dominant Risk Factor
                    </span>
                    <p className="text-xs text-slate-200 m-0 leading-relaxed">
                      {selectedCluster.primaryCause}
                    </p>
                  </div>

                  {/* Engineering Remedy */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                      Recommended Engineering Remedy
                    </span>
                    <p className="text-xs text-slate-300 m-0 leading-relaxed">
                      {selectedCluster.recommendedIntervention}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs space-y-1">
                  <Compass className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                  <p className="font-semibold text-slate-400 m-0">No Hotspot Selected</p>
                  <p className="text-[11px] m-0">
                    Click any hotspot circle on the map or select from the nearest list above.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Cluster Selector */}
            <div className="pt-2 border-t border-slate-800 shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                All Active Clusters ({dataMode === 'LIVE_GPS_DEMO_RISK' ? 'Demo' : 'Historical'}):
              </span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {activeClusters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCluster(c);
                      setSelectedPoint(null);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([c.centerLat, c.centerLng], 14);
                      }
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                      selectedCluster?.id === c.id
                        ? 'bg-cyan-600 border-cyan-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    #{c.clusterNumber.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

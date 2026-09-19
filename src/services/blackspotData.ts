import type { BlackspotPoint, BlackspotCluster, BlackspotSummary, AccidentSeverity } from '../types';

/**
 * Curated Demo / Sample Dataset of Historical Accident Locations
 * Labeled clearly as Demo/Sample Dataset for Hackathon verification.
 */
export const SAMPLE_BLACKSPOT_POINTS: BlackspotPoint[] = [
  // Cluster 1: Rajiv Chowk / NH-48 Junction (Severe Merge Conflict)
  {
    id: 'pt-001',
    lat: 28.4595,
    lng: 77.0266,
    locationName: 'Rajiv Chowk Flyover Merge NH-48',
    date: '2025-11-14',
    severity: 'FATAL',
    accidentType: 'Rear-end high speed collision',
    casualties: 2,
    speedLimitKmh: 80,
    roadType: 'HIGHWAY',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-002',
    lat: 28.4598,
    lng: 77.0271,
    locationName: 'Rajiv Chowk Slip Road',
    date: '2025-12-02',
    severity: 'SEVERE',
    accidentType: 'Sideswipe merging conflict',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-003',
    lat: 28.4592,
    lng: 77.0262,
    locationName: 'Rajiv Chowk Underpass Entry',
    date: '2026-01-18',
    severity: 'FATAL',
    accidentType: 'Head-on barrier impact',
    casualties: 1,
    speedLimitKmh: 70,
    roadType: 'HIGHWAY',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-004',
    lat: 28.4601,
    lng: 77.0275,
    locationName: 'NH-48 Service Lane Rajiv Chowk',
    date: '2026-02-10',
    severity: 'MINOR',
    accidentType: 'Two-wheeler skid',
    casualties: 0,
    speedLimitKmh: 40,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'RAIN',
  },
  {
    id: 'pt-005',
    lat: 28.4589,
    lng: 77.0259,
    locationName: 'Rajiv Chowk South Approach',
    date: '2026-02-28',
    severity: 'SEVERE',
    accidentType: 'Truck blindspot sideswipe',
    casualties: 1,
    speedLimitKmh: 70,
    roadType: 'HIGHWAY',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-006',
    lat: 28.4594,
    lng: 77.0268,
    locationName: 'Rajiv Chowk Median Opening',
    date: '2026-03-05',
    severity: 'FATAL',
    accidentType: 'Pedestrian crossing collision',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'INTERSECTION',
    weatherCondition: 'NIGHT',
  },

  // Cluster 2: IFFCO Chowk Intersection (High Pedestrian & Transit Friction)
  {
    id: 'pt-007',
    lat: 28.4721,
    lng: 77.0652,
    locationName: 'IFFCO Chowk Bus Stop Bay',
    date: '2025-10-19',
    severity: 'FATAL',
    accidentType: 'Bus vs Pedestrian crossing',
    casualties: 1,
    speedLimitKmh: 50,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-008',
    lat: 28.4728,
    lng: 77.0661,
    locationName: 'IFFCO Chowk Metro Gate 2',
    date: '2025-11-23',
    severity: 'SEVERE',
    accidentType: 'Auto-rickshaw overturning',
    casualties: 2,
    speedLimitKmh: 40,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'RAIN',
  },
  {
    id: 'pt-009',
    lat: 28.4715,
    lng: 77.0645,
    locationName: 'IFFCO Chowk Flyover Ramp',
    date: '2026-01-07',
    severity: 'SEVERE',
    accidentType: 'Multi-vehicle pileup',
    casualties: 3,
    speedLimitKmh: 80,
    roadType: 'HIGHWAY',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-010',
    lat: 28.4732,
    lng: 77.0670,
    locationName: 'MG Road Junction IFFCO',
    date: '2026-01-29',
    severity: 'MINOR',
    accidentType: 'Fender bender merge',
    casualties: 0,
    speedLimitKmh: 40,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-011',
    lat: 28.4719,
    lng: 77.0658,
    locationName: 'IFFCO Underpass Exit',
    date: '2026-02-14',
    severity: 'FATAL',
    accidentType: 'Speeding motorcycle guardrail impact',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'CURVE',
    weatherCondition: 'NIGHT',
  },

  // Cluster 3: Shankar Chowk & Cyber City Toll Curve (High Velocity Weaving)
  {
    id: 'pt-012',
    lat: 28.5023,
    lng: 77.0912,
    locationName: 'Shankar Chowk Northbound Curve',
    date: '2025-09-30',
    severity: 'FATAL',
    accidentType: 'High speed curve rollover',
    casualties: 2,
    speedLimitKmh: 90,
    roadType: 'CURVE',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-013',
    lat: 28.5031,
    lng: 77.0925,
    locationName: 'Cyber Hub Rapid Metro Under-bridge',
    date: '2025-12-11',
    severity: 'SEVERE',
    accidentType: 'Pillar collision during wet conditions',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'RAIN',
  },
  {
    id: 'pt-014',
    lat: 28.5018,
    lng: 77.0905,
    locationName: 'Shankar Chowk U-Turn Flyover',
    date: '2026-01-03',
    severity: 'FATAL',
    accidentType: 'Wrong-way entry head-on collision',
    casualties: 2,
    speedLimitKmh: 70,
    roadType: 'INTERSECTION',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-015',
    lat: 28.5027,
    lng: 77.0919,
    locationName: 'NH-48 Km 24 Shankar Chowk',
    date: '2026-02-18',
    severity: 'SEVERE',
    accidentType: 'Commercial truck jackknife',
    casualties: 1,
    speedLimitKmh: 80,
    roadType: 'HIGHWAY',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-016',
    lat: 28.5036,
    lng: 77.0931,
    locationName: 'DLF Cyber City Gateway',
    date: '2026-03-01',
    severity: 'MINOR',
    accidentType: 'Rear-end collision at barrier',
    casualties: 0,
    speedLimitKmh: 30,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },

  // Cluster 4: Hero Honda Chowk (Heavy Freight & Waterlogging Sump)
  {
    id: 'pt-017',
    lat: 28.4385,
    lng: 76.9942,
    locationName: 'Hero Honda Chowk Underpass Basin',
    date: '2025-08-14',
    severity: 'FATAL',
    accidentType: 'Hydroplaning skid into retaining wall',
    casualties: 1,
    speedLimitKmh: 70,
    roadType: 'HIGHWAY',
    weatherCondition: 'RAIN',
  },
  {
    id: 'pt-018',
    lat: 28.4391,
    lng: 76.9950,
    locationName: 'Hero Honda Chowk Service Road West',
    date: '2025-10-05',
    severity: 'SEVERE',
    accidentType: 'Freight truck vs two-wheeler blindspot',
    casualties: 1,
    speedLimitKmh: 50,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-019',
    lat: 28.4379,
    lng: 76.9935,
    locationName: 'NH-48 Southern Elevated Start',
    date: '2025-11-29',
    severity: 'FATAL',
    accidentType: 'Rear-end stationary broken-down trailer',
    casualties: 2,
    speedLimitKmh: 80,
    roadType: 'HIGHWAY',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-020',
    lat: 28.4388,
    lng: 76.9946,
    locationName: 'Subhash Chowk Spur Hero Honda',
    date: '2026-01-22',
    severity: 'MINOR',
    accidentType: 'Lateral merge collision',
    casualties: 0,
    speedLimitKmh: 40,
    roadType: 'INTERSECTION',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-021',
    lat: 28.4372,
    lng: 76.9928,
    locationName: 'Sector 34 Industrial Cut',
    date: '2026-02-25',
    severity: 'SEVERE',
    accidentType: 'Uncontrolled U-turn collision',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },

  // Cluster 5: Golf Course Extension Road Sharp S-Curve
  {
    id: 'pt-022',
    lat: 28.4115,
    lng: 77.0862,
    locationName: 'Golf Course Ext Rd Sector 65 Curve',
    date: '2025-09-12',
    severity: 'FATAL',
    accidentType: 'Night speeding median breach into oncoming traffic',
    casualties: 3,
    speedLimitKmh: 70,
    roadType: 'CURVE',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-023',
    lat: 28.4121,
    lng: 77.0874,
    locationName: 'Vikas Marg Crossing Sector 65',
    date: '2025-11-04',
    severity: 'SEVERE',
    accidentType: 'Red-light violation T-bone',
    casualties: 2,
    speedLimitKmh: 60,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-024',
    lat: 28.4109,
    lng: 77.0851,
    locationName: 'Sector 66 Badshahpur Blind Crest',
    date: '2026-01-14',
    severity: 'FATAL',
    accidentType: 'Overtaking head-on crash on crest',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'CURVE',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-025',
    lat: 28.4118,
    lng: 77.0869,
    locationName: 'Golf Course Extension Service Lane',
    date: '2026-02-09',
    severity: 'MINOR',
    accidentType: 'Cyclist sideswipe near construction trench',
    casualties: 0,
    speedLimitKmh: 35,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'CLEAR',
  },

  // Cluster 6: Kherki Daula Toll Plaza & Dwarka Expressway Interchange
  {
    id: 'pt-026',
    lat: 28.4022,
    lng: 76.9741,
    locationName: 'Kherki Daula Toll Fastag Approach',
    date: '2025-10-27',
    severity: 'SEVERE',
    accidentType: 'Sudden lane change collision in toll queue',
    casualties: 1,
    speedLimitKmh: 40,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-027',
    lat: 28.4015,
    lng: 76.9732,
    locationName: 'Dwarka Expressway Cloverleaf Loop A',
    date: '2025-12-19',
    severity: 'FATAL',
    accidentType: 'High-speed rollover on tight cloverleaf ramp',
    casualties: 1,
    speedLimitKmh: 60,
    roadType: 'CURVE',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-028',
    lat: 28.4030,
    lng: 76.9753,
    locationName: 'CPR Southern Spur Kherki Daula',
    date: '2026-01-26',
    severity: 'FATAL',
    accidentType: 'Heavy dumper truck brake failure rear-end',
    casualties: 2,
    speedLimitKmh: 70,
    roadType: 'HIGHWAY',
    weatherCondition: 'FOG',
  },
  {
    id: 'pt-029',
    lat: 28.4025,
    lng: 76.9746,
    locationName: 'Kherki Daula Pedestrian Crossing Point',
    date: '2026-02-21',
    severity: 'SEVERE',
    accidentType: 'Pedestrian struck during highway crossing',
    casualties: 1,
    speedLimitKmh: 50,
    roadType: 'HIGHWAY',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-030',
    lat: 28.4019,
    lng: 76.9738,
    locationName: 'Manesar Freight Corridor Connector',
    date: '2026-03-08',
    severity: 'MINOR',
    accidentType: 'Mirror scrape during merge',
    casualties: 0,
    speedLimitKmh: 45,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },

  // Additional points for realistic density across the urban grid
  {
    id: 'pt-031',
    lat: 28.4605,
    lng: 77.0280,
    locationName: 'Rajiv Chowk Civil Lines Turn',
    date: '2025-07-22',
    severity: 'SEVERE',
    accidentType: 'Intersection right-turn conflict',
    casualties: 1,
    speedLimitKmh: 45,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  },
  {
    id: 'pt-032',
    lat: 28.4735,
    lng: 77.0675,
    locationName: 'Sukhrali Border IFFCO',
    date: '2025-08-11',
    severity: 'MINOR',
    accidentType: 'Bumper collision at traffic light',
    casualties: 0,
    speedLimitKmh: 30,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'RAIN',
  },
  {
    id: 'pt-033',
    lat: 28.5042,
    lng: 77.0940,
    locationName: 'Ambience Mall Flyover Merge',
    date: '2025-10-02',
    severity: 'FATAL',
    accidentType: 'High speed speed-breaker launch into barrier',
    casualties: 1,
    speedLimitKmh: 80,
    roadType: 'HIGHWAY',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-034',
    lat: 28.4398,
    lng: 76.9961,
    locationName: 'Pace City Industrial Entry',
    date: '2025-11-18',
    severity: 'SEVERE',
    accidentType: 'Heavy tractor trailer crossing without tail lights',
    casualties: 1,
    speedLimitKmh: 50,
    roadType: 'URBAN_CORRIDOR',
    weatherCondition: 'NIGHT',
  },
  {
    id: 'pt-035',
    lat: 28.4129,
    lng: 77.0885,
    locationName: 'Sector 58 Rapid Metro Terminus Cut',
    date: '2026-02-04',
    severity: 'SEVERE',
    accidentType: 'Sudden U-turn over solid white line',
    casualties: 1,
    speedLimitKmh: 55,
    roadType: 'INTERSECTION',
    weatherCondition: 'CLEAR',
  }
];

/**
 * Haversine formula to compute great-circle distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface NearestBlackspot {
  cluster: BlackspotCluster;
  distanceKm: number;
}

export const DEMO_DATASET_LOCATION = {
  lat: 28.4595,
  lng: 77.0266,
  name: 'NH-48 Expressway Corridor (Gurugram / NCR)',
  region: 'Gurugram, Haryana',
};

export const DATASET_COVERAGE_RADIUS_KM = 30;

/**
 * Finds the nearest blackspots to a given coordinate, sorted by distance.
 */
export function findNearestBlackspots(
  userLat: number,
  userLng: number,
  clusters: BlackspotCluster[],
  limit: number = 3
): NearestBlackspot[] {
  return clusters
    .map((cluster) => ({
      cluster,
      distanceKm:
        Math.round(
          haversineDistanceKm(userLat, userLng, cluster.centerLat, cluster.centerLng) * 10
        ) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Generates realistic synthetic incident points strictly clustered around the user's live GPS position.
 * Clearly tagged with source: 'DEMO_SIMULATED' for hackathon demonstration.
 * Does NOT alter or fabricate historical records.
 */
export function generateLocalDemoIncidents(
  centerLat: number,
  centerLng: number
): BlackspotPoint[] {
  const points: BlackspotPoint[] = [];

  // Seed 3 realistic spatial cluster centers in the vicinity (0.6 km to 1.8 km)
  // ~0.009 deg lat = ~1 km, ~0.009 deg lng = ~1 km (at 20-30 deg latitude)
  const clusterSeeds = [
    {
      offsetLat: 0.0065,
      offsetLng: 0.0072,
      type: 'Intersection conflict',
      roadType: 'INTERSECTION' as const,
      name: 'Local Commercial Junction',
    },
    {
      offsetLat: -0.0095,
      offsetLng: 0.0048,
      type: 'Sudden braking',
      roadType: 'URBAN_CORRIDOR' as const,
      name: 'Main Arterial Sector Corridor',
    },
    {
      offsetLat: 0.0032,
      offsetLng: -0.0118,
      type: 'Two-wheeler conflict',
      roadType: 'CURVE' as const,
      name: 'Bypass Curve / Ring Road',
    },
  ];

  const types = [
    'Rear-end conflict',
    'Intersection conflict',
    'Pedestrian conflict',
    'Two-wheeler conflict',
    'Sudden braking',
    'Lane conflict',
  ];

  let ptIndex = 1;

  clusterSeeds.forEach((seed, sIdx) => {
    const clusterPointCount = sIdx === 0 ? 9 : sIdx === 1 ? 7 : 5;
    for (let i = 0; i < clusterPointCount; i++) {
      // Small scatter around cluster seed (~80m to 250m)
      const rLat = (Math.random() - 0.5) * 0.0028;
      const rLng = (Math.random() - 0.5) * 0.0028;
      const lat = Number((centerLat + seed.offsetLat + rLat).toFixed(6));
      const lng = Number((centerLng + seed.offsetLng + rLng).toFixed(6));

      const isFatal = i === 0 && sIdx !== 2;
      const isSevere = i === 1 || (sIdx === 0 && i === 2);
      const severity: AccidentSeverity = isFatal ? 'FATAL' : isSevere ? 'SEVERE' : 'MINOR';
      const casualties = isFatal ? (Math.random() > 0.5 ? 2 : 1) : isSevere ? 1 : 0;

      points.push({
        id: `demo-inc-${String(ptIndex).padStart(3, '0')}`,
        lat,
        lng,
        locationName: `${seed.name} (Simulated Demo Pt #${ptIndex})`,
        date: `2026-03-${String((ptIndex % 18) + 1).padStart(2, '0')}`,
        severity,
        accidentType: i === 0 ? seed.type : types[ptIndex % types.length],
        casualties,
        speedLimitKmh: seed.roadType === 'INTERSECTION' ? 50 : seed.roadType === 'CURVE' ? 40 : 60,
        roadType: seed.roadType,
        weatherCondition: ptIndex % 4 === 0 ? 'RAIN' : ptIndex % 3 === 0 ? 'NIGHT' : 'CLEAR',
        source: 'DEMO_SIMULATED',
      });
      ptIndex++;
    }
  });

  // Add 4 transit points along corridor (outliers / minor incidents)
  for (let i = 0; i < 4; i++) {
    const rDist = 0.005 + Math.random() * 0.012;
    const rAngle = Math.random() * Math.PI * 2;
    const lat = Number((centerLat + Math.cos(rAngle) * rDist).toFixed(6));
    const lng = Number((centerLng + Math.sin(rAngle) * rDist).toFixed(6));
    points.push({
      id: `demo-inc-${String(ptIndex).padStart(3, '0')}`,
      lat,
      lng,
      locationName: `Isolated Transit Incident #${ptIndex} (Simulated)`,
      date: `2026-03-${String((ptIndex % 18) + 1).padStart(2, '0')}`,
      severity: 'MINOR',
      accidentType: types[ptIndex % types.length],
      casualties: 0,
      speedLimitKmh: 50,
      roadType: 'URBAN_CORRIDOR',
      weatherCondition: 'CLEAR',
      source: 'DEMO_SIMULATED',
    });
    ptIndex++;
  }

  return points;
}

/**
 * Spatial clustering heuristic (radius-based DBSCAN model)
 * Groups points within maxRadiusKm (default 0.75 km) into verified Blackspots.
 */
export function computeBlackspotClusters(
  points: BlackspotPoint[] = SAMPLE_BLACKSPOT_POINTS,
  maxRadiusKm: number = 0.75,
  minPointsPerCluster: number = 3
): BlackspotCluster[] {
  const visited = new Set<string>();
  const clusters: BlackspotCluster[] = [];
  let clusterIdCounter = 1;

  const isDemo = points.some((p) => p.source === 'DEMO_SIMULATED');

  for (const point of points) {
    if (visited.has(point.id)) continue;

    // Find all neighbors within radius
    const neighbors = points.filter(
      (p) => haversineDistanceKm(point.lat, point.lng, p.lat, p.lng) <= maxRadiusKm
    );

    if (neighbors.length >= minPointsPerCluster) {
      // Form new cluster
      const clusterPoints: BlackspotPoint[] = [];
      for (const n of neighbors) {
        visited.add(n.id);
        clusterPoints.push(n);
      }

      // Calculate centroid
      const centerLat =
        clusterPoints.reduce((acc, p) => acc + p.lat, 0) / clusterPoints.length;
      const centerLng =
        clusterPoints.reduce((acc, p) => acc + p.lng, 0) / clusterPoints.length;

      const fatalCount = clusterPoints.filter((p) => p.severity === 'FATAL').length;
      const severeCount = clusterPoints.filter((p) => p.severity === 'SEVERE').length;
      const minorCount = clusterPoints.filter((p) => p.severity === 'MINOR').length;

      let riskIntensity: 'CRITICAL' | 'HIGH' | 'MODERATE' = 'MODERATE';
      if (fatalCount >= 2 || clusterPoints.length >= 6) {
        riskIntensity = 'CRITICAL';
      } else if (fatalCount >= 1 || severeCount >= 2) {
        riskIntensity = 'HIGH';
      }

      let name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')}`;
      let primaryCause = 'High-velocity conflict and inadequate weaving corridor';
      let recommendedIntervention =
        'Install speed-calming rumble strips, high-friction road surfacing & illuminated cautionary chevron signage.';

      if (isDemo) {
        name = `DEMO Hotspot #${clusterIdCounter.toString().padStart(2, '0')} (Synthetic Local Cluster)`;
        primaryCause =
          fatalCount >= 1
            ? 'Simulated severe multilane merge and high pedestrian conflict zone'
            : 'Simulated high conflict density demonstration area';
        recommendedIntervention =
          'Simulated engineering countermeasure: Automated radar speed feedback and priority intersection channelization.';
      } else {
        if (centerLat > 28.49) {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — Shankar Chowk Weaving Corridor`;
          primaryCause = 'Sharp high-speed curve entry with high lateral lane weaving';
          recommendedIntervention = 'Lane channelization delineators and variable LED speed advisories.';
        } else if (centerLat > 28.46) {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — IFFCO Chowk Multimodal Friction`;
          primaryCause = 'Unregulated pedestrian crossing across 8-lane expressway access ramps';
          recommendedIntervention = 'Grade-separated skywalk, pedestrian median fencing and automated pedestrian radar.';
        } else if (centerLat > 28.44) {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — Rajiv Chowk Expressway Merge`;
          primaryCause = 'Slip road merge blindspots and conflicting underpass traffic speed differentials';
          recommendedIntervention = 'Extended merge acceleration zone and dynamic radar speed feedback signs.';
        } else if (centerLat > 28.42) {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — Hero Honda Chowk Basin`;
          primaryCause = 'Monsoon hydroplaning risk and heavy commercial vehicle blindspot turns';
          recommendedIntervention = 'Enhanced stormwater camber drainage and dedicated commercial truck bypass lanes.';
        } else if (centerLat > 28.405) {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — Golf Course Ext S-Curve`;
          primaryCause = 'Speeding on curved median with uncontrolled mid-block U-turns';
          recommendedIntervention = 'Concrete New Jersey median barrier closure and red-light enforcement cameras.';
        } else {
          name = `Blackspot #${clusterIdCounter.toString().padStart(2, '0')} — Kherki Daula Interchange`;
          primaryCause = 'Toll queue tailback collisions and abrupt heavy-vehicle lane shifts';
          recommendedIntervention = 'Pre-toll overhead warning flashers and continuous electronic crash cushions.';
        }
      }

      clusters.push({
        id: isDemo ? `demo-cluster-${clusterIdCounter}` : `cluster-${clusterIdCounter}`,
        clusterNumber: clusterIdCounter,
        name,
        centerLat,
        centerLng,
        totalIncidents: clusterPoints.length,
        fatalCount,
        severeCount,
        minorCount,
        riskIntensity,
        primaryCause,
        recommendedIntervention,
        radiusMeters: Math.round(maxRadiusKm * 1000),
        points: clusterPoints,
        source: isDemo ? 'DEMO_SIMULATED' : 'HISTORICAL_DATASET',
      });

      clusterIdCounter++;
    }
  }

  return clusters;
}

/**
 * Generates an overall Blackspot Summary across the entire network.
 */
export function getBlackspotSummary(
  clusters: BlackspotCluster[],
  allPoints: BlackspotPoint[] = SAMPLE_BLACKSPOT_POINTS
): BlackspotSummary {
  const highRiskHotspots = clusters.filter(
    (c) => c.riskIntensity === 'CRITICAL' || c.riskIntensity === 'HIGH'
  ).length;

  // Regional risk heuristic: 0 - 100 based on fatal ratio & density
  const totalFatal = allPoints.filter((p) => p.severity === 'FATAL').length;
  const totalSevere = allPoints.filter((p) => p.severity === 'SEVERE').length;
  const rawScore = (totalFatal * 6 + totalSevere * 3 + allPoints.length * 0.5) / 1.5;
  const regionalRiskIndex = Math.min(100, Math.round(rawScore));

  return {
    totalClusters: clusters.length,
    totalIncidents: allPoints.length,
    highRiskHotspots,
    nearestCluster: clusters[0] || null,
    regionalRiskIndex,
  };
}

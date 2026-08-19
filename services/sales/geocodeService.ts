'use server';

import { normalizeCoordinates, extractEmbeddedCoordinates as parseEmbeddedCoords } from '@/lib/sales/locationParser';

// ============================================================================
// Geographic Knowledge Base for Malaysian Postcodes, Towns, States & Regions
// ============================================================================

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

// Bounding box for Southeast Asia / Malaysia region
function isReasonableCoordinates(lat: number, lng: number): boolean {
  return lat >= -11 && lat <= 22 && lng >= 95 && lng <= 145;
}

// Coordinate database for Malaysian states & federal territories
const STATE_COORDINATES: Record<string, LocationCoordinates> = {
  'perlis': { lat: 6.4449, lng: 100.2048 },
  'kedah': { lat: 6.1248, lng: 100.3678 },
  'penang': { lat: 5.4141, lng: 100.3288 },
  'pulau pinang': { lat: 5.4141, lng: 100.3288 },
  'perak': { lat: 4.5975, lng: 101.0901 },
  'selangor': { lat: 3.0733, lng: 101.5185 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'kl': { lat: 3.1390, lng: 101.6869 },
  'wilayah persekutuan kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'w.p. kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'putrajaya': { lat: 2.9264, lng: 101.6964 },
  'wilayah persekutuan putrajaya': { lat: 2.9264, lng: 101.6964 },
  'w.p. putrajaya': { lat: 2.9264, lng: 101.6964 },
  'negeri sembilan': { lat: 2.7258, lng: 101.9424 },
  'melaka': { lat: 2.1896, lng: 102.2501 },
  'malacca': { lat: 2.1896, lng: 102.2501 },
  'johor': { lat: 1.4927, lng: 103.7414 },
  'pahang': { lat: 3.8168, lng: 103.3317 },
  'terengganu': { lat: 5.3117, lng: 103.1324 },
  'kelantan': { lat: 6.1254, lng: 102.2386 },
  'sarawak': { lat: 1.5533, lng: 110.3592 },
  'sabah': { lat: 5.9804, lng: 116.0735 },
  'labuan': { lat: 5.2831, lng: 115.2308 },
  'wilayah persekutuan labuan': { lat: 5.2831, lng: 115.2308 },
  'w.p. labuan': { lat: 5.2831, lng: 115.2308 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'brunei': { lat: 4.9031, lng: 114.9398 },
  'indonesia': { lat: -0.7893, lng: 113.9213 },
  'thailand': { lat: 15.8700, lng: 100.9925 },
};

// Major Malaysian landmarks, universities, and commercial hubs
const KNOWN_LANDMARKS: Record<string, { lat: number; lng: number; state: string }> = {
  'klcc': { lat: 3.1578, lng: 101.7120, state: 'Kuala Lumpur' },
  'petronas twin towers': { lat: 3.1578, lng: 101.7120, state: 'Kuala Lumpur' },
  'klia': { lat: 2.7456, lng: 101.7072, state: 'Selangor' },
  'klia2': { lat: 2.7433, lng: 101.6854, state: 'Selangor' },
  'kuala lumpur international airport': { lat: 2.7456, lng: 101.7072, state: 'Selangor' },
  'sunway pyramid': { lat: 3.0733, lng: 101.6074, state: 'Selangor' },
  'sunway': { lat: 3.0733, lng: 101.6074, state: 'Selangor' },
  'mid valley': { lat: 3.1180, lng: 101.6775, state: 'Kuala Lumpur' },
  'mid valley megamall': { lat: 3.1180, lng: 101.6775, state: 'Kuala Lumpur' },
  'pavilion kl': { lat: 3.1488, lng: 101.7136, state: 'Kuala Lumpur' },
  'pavilion kuala lumpur': { lat: 3.1488, lng: 101.7136, state: 'Kuala Lumpur' },
  'pavilion bukit jalil': { lat: 3.0514, lng: 101.6706, state: 'Kuala Lumpur' },
  '1 utama': { lat: 3.1502, lng: 101.6152, state: 'Selangor' },
  'one utama': { lat: 3.1502, lng: 101.6152, state: 'Selangor' },
  'ioi city mall': { lat: 2.9700, lng: 101.7139, state: 'Putrajaya' },
  'ioi mall puchong': { lat: 3.0450, lng: 101.6200, state: 'Selangor' },
  'bukit bintang': { lat: 3.1466, lng: 101.7112, state: 'Kuala Lumpur' },
  'utm': { lat: 1.5588, lng: 103.6378, state: 'Johor' },
  'universiti teknologi malaysia': { lat: 1.5588, lng: 103.6378, state: 'Johor' },
  'usm': { lat: 5.3563, lng: 100.3013, state: 'Penang' },
  'universiti sains malaysia': { lat: 5.3563, lng: 100.3013, state: 'Penang' },
  'um': { lat: 3.1209, lng: 101.6538, state: 'Kuala Lumpur' },
  'universiti malaya': { lat: 3.1209, lng: 101.6538, state: 'Kuala Lumpur' },
  'ukm': { lat: 2.9289, lng: 101.7801, state: 'Selangor' },
  'universiti kebangsaan malaysia': { lat: 2.9289, lng: 101.7801, state: 'Selangor' },
  'upm': { lat: 2.9999, lng: 101.7081, state: 'Selangor' },
  'universiti putra malaysia': { lat: 2.9999, lng: 101.7081, state: 'Selangor' },
  'utar': { lat: 4.3400, lng: 101.1400, state: 'Perak' },
  'universiti tunku abdul rahman': { lat: 4.3400, lng: 101.1400, state: 'Perak' },
  'genting': { lat: 3.4239, lng: 101.7932, state: 'Pahang' },
  'genting highlands': { lat: 3.4239, lng: 101.7932, state: 'Pahang' },
  'cameron highlands': { lat: 4.4714, lng: 101.3768, state: 'Pahang' },
  'batu caves': { lat: 3.2379, lng: 101.6840, state: 'Selangor' },
};

// Major Malaysian towns, cities & districts with high precision
const KNOWN_TOWNS: Record<string, { lat: number; lng: number; state: string }> = {
  // Perlis
  'sena': { lat: 6.4382, lng: 100.2081, state: 'Perlis' },
  'kangar': { lat: 6.4414, lng: 100.1986, state: 'Perlis' },
  'arau': { lat: 6.4312, lng: 100.2750, state: 'Perlis' },
  'kuala perlis': { lat: 6.4000, lng: 100.1333, state: 'Perlis' },
  'padang besar': { lat: 6.6622, lng: 100.3211, state: 'Perlis' },
  'simpang empat perlis': { lat: 6.3333, lng: 100.1833, state: 'Perlis' },
  'kaki bukit': { lat: 6.6436, lng: 100.2083, state: 'Perlis' },

  // Kedah
  'alor setar': { lat: 6.1248, lng: 100.3678, state: 'Kedah' },
  'jitra': { lat: 6.2681, lng: 100.4217, state: 'Kedah' },
  'sungai petani': { lat: 5.6470, lng: 100.4877, state: 'Kedah' },
  'kulim': { lat: 5.3649, lng: 100.5618, state: 'Kedah' },
  'langkawi': { lat: 6.3500, lng: 99.8000, state: 'Kedah' },
  'kuah': { lat: 6.3265, lng: 99.8432, state: 'Kedah' },
  'kodiang': { lat: 6.3934, lng: 100.3045, state: 'Kedah' },
  'pokok sena': { lat: 6.1667, lng: 100.5167, state: 'Kedah' },
  'pendang': { lat: 5.9833, lng: 100.4833, state: 'Kedah' },
  'baling': { lat: 5.6783, lng: 100.9172, state: 'Kedah' },
  'sik': { lat: 5.8236, lng: 100.7444, state: 'Kedah' },
  'yan': { lat: 5.8000, lng: 100.3667, state: 'Kedah' },
  'gurun': { lat: 5.8167, lng: 100.4667, state: 'Kedah' },
  'bedong': { lat: 5.7275, lng: 100.5097, state: 'Kedah' },
  'lunas': { lat: 5.4333, lng: 100.5333, state: 'Kedah' },
  'kuala kedah': { lat: 6.1083, lng: 100.2944, state: 'Kedah' },
  'bandar baharu': { lat: 5.1333, lng: 100.5000, state: 'Kedah' },

  // Penang
  'george town': { lat: 5.4141, lng: 100.3288, state: 'Penang' },
  'bayan lepas': { lat: 5.2952, lng: 100.2592, state: 'Penang' },
  'butterworth': { lat: 5.3991, lng: 100.3638, state: 'Penang' },
  'bukit mertajam': { lat: 5.3630, lng: 100.4570, state: 'Penang' },
  'tanjung tokong': { lat: 5.4600, lng: 100.3060, state: 'Penang' },
  'tanjung bungah': { lat: 5.4650, lng: 100.2800, state: 'Penang' },
  'batu ferringhi': { lat: 5.4700, lng: 100.2450, state: 'Penang' },
  'air itam': { lat: 5.4010, lng: 100.2780, state: 'Penang' },
  'jelutong': { lat: 5.3900, lng: 100.3120, state: 'Penang' },
  'gelugor': { lat: 5.3750, lng: 100.3060, state: 'Penang' },
  'balik pulau': { lat: 5.3500, lng: 100.2333, state: 'Penang' },
  'perai': { lat: 5.3833, lng: 100.3833, state: 'Penang' },
  'simpang ampat': { lat: 5.2833, lng: 100.4833, state: 'Penang' },
  'nibong tebal': { lat: 5.1659, lng: 100.4779, state: 'Penang' },
  'kepala batas': { lat: 5.5167, lng: 100.4333, state: 'Penang' },
  'seberang jaya': { lat: 5.3950, lng: 100.4000, state: 'Penang' },
  'seberang perai': { lat: 5.3630, lng: 100.4570, state: 'Penang' },

  // Perak
  'kampar': { lat: 4.3110, lng: 101.1500, state: 'Perak' },
  'ipoh': { lat: 4.5975, lng: 101.0901, state: 'Perak' },
  'taiping': { lat: 4.8500, lng: 100.7333, state: 'Perak' },
  'kamunting': { lat: 4.8872, lng: 100.7297, state: 'Perak' },
  'teluk intan': { lat: 4.0259, lng: 101.0178, state: 'Perak' },
  'sitiawan': { lat: 4.2167, lng: 100.7000, state: 'Perak' },
  'seri manjung': { lat: 4.1950, lng: 100.6650, state: 'Perak' },
  'manjung': { lat: 4.1950, lng: 100.6650, state: 'Perak' },
  'lumut': { lat: 4.2328, lng: 100.6298, state: 'Perak' },
  'batu gajah': { lat: 4.4692, lng: 101.0411, state: 'Perak' },
  'tanjung malim': { lat: 3.6833, lng: 101.5167, state: 'Perak' },
  'tanjong malim': { lat: 3.6833, lng: 101.5167, state: 'Perak' },
  'tanjong rambutan': { lat: 4.6710, lng: 101.1554, state: 'Perak' },
  'tanjung rambutan': { lat: 4.6710, lng: 101.1554, state: 'Perak' },
  'kuala kangsar': { lat: 4.7749, lng: 100.9415, state: 'Perak' },
  'sungai siput': { lat: 4.8167, lng: 101.0667, state: 'Perak' },
  'tapah': { lat: 4.1833, lng: 101.2667, state: 'Perak' },
  'bidor': { lat: 4.1167, lng: 101.2833, state: 'Perak' },
  'sungkai': { lat: 3.9972, lng: 101.3097, state: 'Perak' },
  'slim river': { lat: 3.8333, lng: 101.4000, state: 'Perak' },
  'gopeng': { lat: 4.4500, lng: 101.1667, state: 'Perak' },
  'chemor': { lat: 4.7167, lng: 101.1167, state: 'Perak' },
  'parit buntar': { lat: 5.1167, lng: 100.4833, state: 'Perak' },
  'bagan serai': { lat: 5.0167, lng: 100.5333, state: 'Perak' },
  'gerik': { lat: 5.4167, lng: 101.1333, state: 'Perak' },
  'lenggong': { lat: 5.1000, lng: 100.9667, state: 'Perak' },
  'pangkor': { lat: 4.2167, lng: 100.5667, state: 'Perak' },

  // Selangor & KL
  'petaling jaya': { lat: 3.1073, lng: 101.6067, state: 'Selangor' },
  'shah alam': { lat: 3.0733, lng: 101.5185, state: 'Selangor' },
  'subang jaya': { lat: 3.0565, lng: 101.5851, state: 'Selangor' },
  'subang': { lat: 3.0565, lng: 101.5851, state: 'Selangor' },
  'usj': { lat: 3.0478, lng: 101.5833, state: 'Selangor' },
  'ss2': { lat: 3.1189, lng: 101.6214, state: 'Selangor' },
  'damansara': { lat: 3.1360, lng: 101.6200, state: 'Selangor' },
  'kota damansara': { lat: 3.1517, lng: 101.5900, state: 'Selangor' },
  'ara damansara': { lat: 3.1228, lng: 101.5833, state: 'Selangor' },
  'damansara utama': { lat: 3.1360, lng: 101.6200, state: 'Selangor' },
  'damansara jaya': { lat: 3.1280, lng: 101.6180, state: 'Selangor' },
  'bandar utama': { lat: 3.1450, lng: 101.6150, state: 'Selangor' },
  'puchong': { lat: 3.0333, lng: 101.6167, state: 'Selangor' },
  'klang': { lat: 3.0449, lng: 101.4456, state: 'Selangor' },
  'bukit tinggi klang': { lat: 3.0089, lng: 101.4339, state: 'Selangor' },
  'kajang': { lat: 2.9927, lng: 101.7909, state: 'Selangor' },
  'bangi': { lat: 2.9289, lng: 101.7769, state: 'Selangor' },
  'bandar baru bangi': { lat: 2.9289, lng: 101.7769, state: 'Selangor' },
  'cyberjaya': { lat: 2.9213, lng: 101.6559, state: 'Selangor' },
  'putrajaya': { lat: 2.9264, lng: 101.6964, state: 'Putrajaya' },
  'rawang': { lat: 3.3213, lng: 101.5767, state: 'Selangor' },
  'seri kembangan': { lat: 3.0227, lng: 101.7058, state: 'Selangor' },
  'serdang': { lat: 3.0227, lng: 101.7058, state: 'Selangor' },
  'semenyih': { lat: 2.9500, lng: 101.8500, state: 'Selangor' },
  'ampang': { lat: 3.1499, lng: 101.7621, state: 'Selangor' },
  'pandan indah': { lat: 3.1322, lng: 101.7533, state: 'Selangor' },
  'selayang': { lat: 3.2500, lng: 101.6500, state: 'Selangor' },
  'gombak': { lat: 3.2200, lng: 101.7100, state: 'Selangor' },
  'sungai buloh': { lat: 3.2064, lng: 101.5819, state: 'Selangor' },
  'puncak alam': { lat: 3.2323, lng: 101.4339, state: 'Selangor' },
  'kuala selangor': { lat: 3.3444, lng: 101.2500, state: 'Selangor' },
  'banting': { lat: 2.8167, lng: 101.5000, state: 'Selangor' },
  'sepang': { lat: 2.6833, lng: 101.7500, state: 'Selangor' },
  'setia alam': { lat: 3.1367, lng: 101.4633, state: 'Selangor' },
  'kota kemuning': { lat: 3.0033, lng: 101.5367, state: 'Selangor' },
  'cheras': { lat: 3.1070, lng: 101.7280, state: 'Kuala Lumpur' },
  'bangsar': { lat: 3.1292, lng: 101.6702, state: 'Kuala Lumpur' },
  'mont kiara': { lat: 3.1678, lng: 101.6517, state: 'Kuala Lumpur' },
  'sri hartamas': { lat: 3.1633, lng: 101.6550, state: 'Kuala Lumpur' },
  'hartamas': { lat: 3.1633, lng: 101.6550, state: 'Kuala Lumpur' },
  'kepong': { lat: 3.2181, lng: 101.6366, state: 'Kuala Lumpur' },
  'setapak': { lat: 3.1904, lng: 101.7107, state: 'Kuala Lumpur' },
  'wangsa maju': { lat: 3.1979, lng: 101.7397, state: 'Kuala Lumpur' },
  'sentul': { lat: 3.1818, lng: 101.6917, state: 'Kuala Lumpur' },
  'bukit jalil': { lat: 3.0585, lng: 101.6917, state: 'Kuala Lumpur' },
  'sungai besi': { lat: 3.0645, lng: 101.7088, state: 'Kuala Lumpur' },
  'sri petaling': { lat: 3.0681, lng: 101.6881, state: 'Kuala Lumpur' },
  'brickfields': { lat: 3.1300, lng: 101.6860, state: 'Kuala Lumpur' },
  'ttdi': { lat: 3.1420, lng: 101.6280, state: 'Kuala Lumpur' },
  'taman tun dr ismail': { lat: 3.1420, lng: 101.6280, state: 'Kuala Lumpur' },

  // Negeri Sembilan
  'seremban': { lat: 2.7258, lng: 101.9424, state: 'Negeri Sembilan' },
  'nilai': { lat: 2.8125, lng: 101.7972, state: 'Negeri Sembilan' },
  'port dickson': { lat: 2.5228, lng: 101.7959, state: 'Negeri Sembilan' },
  'senawang': { lat: 2.6833, lng: 101.9833, state: 'Negeri Sembilan' },
  'bahau': { lat: 2.8078, lng: 102.4081, state: 'Negeri Sembilan' },
  'kuala pilah': { lat: 2.7389, lng: 102.2486, state: 'Negeri Sembilan' },
  'rembau': { lat: 2.5897, lng: 102.0942, state: 'Negeri Sembilan' },
  'tampin': { lat: 2.4703, lng: 102.2300, state: 'Negeri Sembilan' },

  // Melaka
  'melaka tengah': { lat: 2.1896, lng: 102.2501, state: 'Melaka' },
  'ayer keroh': { lat: 2.2700, lng: 102.2800, state: 'Melaka' },
  'alor gajah': { lat: 2.3833, lng: 102.2083, state: 'Melaka' },
  'jasin': { lat: 2.3167, lng: 102.4333, state: 'Melaka' },
  'masjid tanah': { lat: 2.3500, lng: 102.1000, state: 'Melaka' },
  'batu berendam': { lat: 2.2500, lng: 102.2500, state: 'Melaka' },
  'klebang': { lat: 2.2200, lng: 102.1900, state: 'Melaka' },

  // Johor
  'johor bahru': { lat: 1.4927, lng: 103.7414, state: 'Johor' },
  'jb': { lat: 1.4927, lng: 103.7414, state: 'Johor' },
  'taman universiti': { lat: 1.5300, lng: 103.6260, state: 'Johor' },
  'skudai': { lat: 1.5368, lng: 103.6583, state: 'Johor' },
  'mount austin': { lat: 1.5510, lng: 103.7850, state: 'Johor' },
  'austin heights': { lat: 1.5510, lng: 103.7850, state: 'Johor' },
  'bukit indah': { lat: 1.4828, lng: 103.6550, state: 'Johor' },
  'tebrau': { lat: 1.5450, lng: 103.7950, state: 'Johor' },
  'permas jaya': { lat: 1.5000, lng: 103.8150, state: 'Johor' },
  'batu pahat': { lat: 1.8548, lng: 102.9325, state: 'Johor' },
  'muar': { lat: 2.0442, lng: 102.5689, state: 'Johor' },
  'kluang': { lat: 2.0251, lng: 103.3328, state: 'Johor' },
  'kulai': { lat: 1.6601, lng: 103.6032, state: 'Johor' },
  'senai': { lat: 1.6006, lng: 103.6436, state: 'Johor' },
  'pasir gudang': { lat: 1.4684, lng: 103.9014, state: 'Johor' },
  'iskandar puteri': { lat: 1.4230, lng: 103.6580, state: 'Johor' },
  'nusajaya': { lat: 1.4230, lng: 103.6580, state: 'Johor' },
  'medini': { lat: 1.4250, lng: 103.6300, state: 'Johor' },
  'segamat': { lat: 2.5148, lng: 102.8158, state: 'Johor' },
  'pontian': { lat: 1.4988, lng: 103.3899, state: 'Johor' },
  'kota tinggi': { lat: 1.7381, lng: 103.8999, state: 'Johor' },
  'mersing': { lat: 2.4312, lng: 103.8405, state: 'Johor' },
  'tangkak': { lat: 2.2678, lng: 102.5453, state: 'Johor' },
  'yong peng': { lat: 2.0136, lng: 103.0658, state: 'Johor' },

  // Pahang
  'kuantan': { lat: 3.8168, lng: 103.3317, state: 'Pahang' },
  'temerloh': { lat: 3.4506, lng: 102.4175, state: 'Pahang' },
  'bentong': { lat: 3.5222, lng: 101.9084, state: 'Pahang' },
  'mentakab': { lat: 3.4854, lng: 102.3484, state: 'Pahang' },
  'raub': { lat: 3.7899, lng: 101.8570, state: 'Pahang' },
  'jerantut': { lat: 3.9333, lng: 102.3667, state: 'Pahang' },
  'pekan': { lat: 3.4833, lng: 103.4000, state: 'Pahang' },
  'tanah rata': { lat: 4.4714, lng: 101.3768, state: 'Pahang' },

  // Terengganu
  'kuala terengganu': { lat: 5.3117, lng: 103.1324, state: 'Terengganu' },
  'kemaman': { lat: 4.2405, lng: 103.4219, state: 'Terengganu' },
  'chukai': { lat: 4.2405, lng: 103.4219, state: 'Terengganu' },
  'dungun': { lat: 4.7754, lng: 103.4162, state: 'Terengganu' },
  'kerteh': { lat: 4.5141, lng: 103.4484, state: 'Terengganu' },
  'besut': { lat: 5.7333, lng: 102.5000, state: 'Terengganu' },
  'jerteh': { lat: 5.7333, lng: 102.5000, state: 'Terengganu' },

  // Kelantan
  'kota bharu': { lat: 6.1254, lng: 102.2386, state: 'Kelantan' },
  'pasir mas': { lat: 6.0417, lng: 102.1417, state: 'Kelantan' },
  'tumpat': { lat: 6.2000, lng: 102.1667, state: 'Kelantan' },
  'tanah merah': { lat: 5.8092, lng: 102.1485, state: 'Kelantan' },
  'machang': { lat: 5.7667, lng: 102.2167, state: 'Kelantan' },
  'kuala krai': { lat: 5.5333, lng: 102.2000, state: 'Kelantan' },
  'gua musang': { lat: 4.8833, lng: 101.9667, state: 'Kelantan' },

  // Sabah
  'kota kinabalu': { lat: 5.9804, lng: 116.0735, state: 'Sabah' },
  'sandakan': { lat: 5.8394, lng: 118.1172, state: 'Sabah' },
  'tawau': { lat: 4.2447, lng: 117.8912, state: 'Sabah' },
  'lahad datu': { lat: 5.0268, lng: 118.3270, state: 'Sabah' },
  'keningau': { lat: 5.3436, lng: 116.1603, state: 'Sabah' },
  'semporna': { lat: 4.4817, lng: 118.6111, state: 'Sabah' },
  'penampang': { lat: 5.9125, lng: 116.1139, state: 'Sabah' },
  'ranau': { lat: 5.9536, lng: 116.6642, state: 'Sabah' },

  // Sarawak
  'kuching': { lat: 1.5533, lng: 110.3592, state: 'Sarawak' },
  'miri': { lat: 4.4148, lng: 114.0089, state: 'Sarawak' },
  'sibu': { lat: 2.2875, lng: 111.8305, state: 'Sarawak' },
  'bintulu': { lat: 3.1667, lng: 113.0333, state: 'Sarawak' },
  'sarikei': { lat: 2.1167, lng: 111.5167, state: 'Sarawak' },
  'kota samarahan': { lat: 1.4333, lng: 110.4500, state: 'Sarawak' },
  'sri aman': { lat: 1.2333, lng: 111.4667, state: 'Sarawak' },

  // Federal / Regional
  'labuan': { lat: 5.2831, lng: 115.2308, state: 'Labuan' },
  'bandar seri begawan': { lat: 4.9031, lng: 114.9398, state: 'Brunei' },
};

/**
 * Maps Malaysian 5-digit postal code ranges to coordinates
 */
function getCoordinatesFromPostcode(postcodeStr: string): LocationCoordinates | null {
  const code = parseInt(postcodeStr, 10);
  if (isNaN(code) || code < 1000 || code > 99000) return null;

  // Specific high-frequency postcodes
  if (code === 1000) return { lat: 6.4382, lng: 100.2081 }; // Sena, Perlis
  if (code === 31900 || code === 31910) return { lat: 4.3110, lng: 101.1500 }; // Kampar, Perak

  // Perlis (01000 - 02800)
  if (code >= 1000 && code <= 2800) {
    if (code >= 2600 && code <= 2700) return { lat: 6.4312, lng: 100.2750 }; // Arau
    if (code >= 2000 && code <= 2090) return { lat: 6.4000, lng: 100.1333 }; // Kuala Perlis
    if (code >= 2100 && code <= 2200) return { lat: 6.6622, lng: 100.3211 }; // Padang Besar
    return { lat: 6.4414, lng: 100.1986 }; // Kangar / Sena
  }

  // Kedah (05000 - 09810)
  if (code >= 5000 && code <= 9810) {
    if (code >= 7000 && code <= 7100) return { lat: 6.3500, lng: 99.8000 }; // Langkawi
    if (code >= 8000 && code <= 8800) return { lat: 5.6470, lng: 100.4877 }; // Sungai Petani
    if (code >= 9000 && code <= 9810) return { lat: 5.3649, lng: 100.5618 }; // Kulim
    if (code >= 6000 && code <= 6900) return { lat: 6.2681, lng: 100.4217 }; // Jitra
    return { lat: 6.1248, lng: 100.3678 }; // Alor Setar
  }

  // Penang (10000 - 14400)
  if (code >= 10000 && code <= 14400) {
    if (code >= 11900 && code <= 11960) return { lat: 5.2952, lng: 100.2592 }; // Bayan Lepas
    if (code >= 12000 && code <= 13900) return { lat: 5.3991, lng: 100.3638 }; // Butterworth / Seberang Perai
    if (code >= 14000 && code <= 14400) return { lat: 5.3630, lng: 100.4570 }; // Bukit Mertajam
    return { lat: 5.4141, lng: 100.3288 }; // George Town / Island
  }

  // Kelantan (15000 - 18500)
  if (code >= 15000 && code <= 18500) {
    if (code >= 17000 && code <= 17700) return { lat: 5.8092, lng: 102.1485 }; // Tanah Merah / Pasir Mas
    if (code >= 18000 && code <= 18500) return { lat: 5.5333, lng: 102.2000 }; // Kuala Krai / Gua Musang
    return { lat: 6.1254, lng: 102.2386 }; // Kota Bharu
  }

  // Terengganu (20000 - 24300)
  if (code >= 20000 && code <= 24300) {
    if (code >= 23000 && code <= 23400) return { lat: 4.7754, lng: 103.4162 }; // Dungun
    if (code >= 24000 && code <= 24300) return { lat: 4.2405, lng: 103.4219 }; // Kemaman / Chukai
    return { lat: 5.3117, lng: 103.1324 }; // Kuala Terengganu
  }

  // Pahang (25000 - 28800)
  if (code >= 25000 && code <= 28800) {
    if (code >= 28000 && code <= 28400) return { lat: 3.4506, lng: 102.4175 }; // Temerloh / Mentakab
    if (code >= 28600 && code <= 28700) return { lat: 3.5222, lng: 101.9084 }; // Bentong
    return { lat: 3.8168, lng: 103.3317 }; // Kuantan
  }

  // Perak (30000 - 36810)
  if (code >= 30000 && code <= 36810) {
    if (code >= 31900 && code <= 31950) return { lat: 4.3110, lng: 101.1500 }; // Kampar
    if (code >= 32000 && code <= 32800) return { lat: 4.2167, lng: 100.7000 }; // Sitiawan / Manjung / Lumut
    if (code >= 33000 && code <= 33800) return { lat: 4.7749, lng: 100.9415 }; // Kuala Kangsar
    if (code >= 34000 && code <= 34950) return { lat: 4.8500, lng: 100.7333 }; // Taiping
    if (code >= 35000 && code <= 35900) return { lat: 4.1833, lng: 101.2667 }; // Tapah / Bidor / Tg Malim
    if (code >= 36000 && code <= 36810) return { lat: 4.0259, lng: 101.0178 }; // Teluk Intan
    return { lat: 4.5975, lng: 101.0901 }; // Ipoh / Kinta
  }

  // Cameron Highlands (39000 - 39200)
  if (code >= 39000 && code <= 39200) {
    return { lat: 4.4714, lng: 101.3768 };
  }

  // Selangor & Putrajaya (40000 - 48300, 62000 - 68100)
  if (code >= 40000 && code <= 40999) return { lat: 3.0733, lng: 101.5185 }; // Shah Alam
  if (code >= 41000 && code <= 42999) return { lat: 3.0449, lng: 101.4456 }; // Klang / Banting
  if (code >= 43000 && code <= 43999) return { lat: 2.9927, lng: 101.7909 }; // Kajang / Bangi / Serdang
  if (code >= 45000 && code <= 45800) return { lat: 3.3444, lng: 101.2500 }; // Kuala Selangor
  if (code >= 46000 && code <= 46999) return { lat: 3.1073, lng: 101.6067 }; // Petaling Jaya
  if (code >= 47000 && code <= 47830) return { lat: 3.0565, lng: 101.5851 }; // Subang Jaya / Puchong
  if (code >= 48000 && code <= 48300) return { lat: 3.3213, lng: 101.5767 }; // Rawang
  if (code >= 62000 && code <= 62988) return { lat: 2.9264, lng: 101.6964 }; // Putrajaya
  if (code >= 63000 && code <= 63300) return { lat: 2.9213, lng: 101.6559 }; // Cyberjaya
  if (code >= 68000 && code <= 68100) return { lat: 3.1499, lng: 101.7621 }; // Ampang / Batu Caves

  // Kuala Lumpur (50000 - 60000)
  if (code >= 50000 && code <= 60000) {
    if (code >= 59000 && code <= 59200) return { lat: 3.1292, lng: 101.6702 }; // Bangsar
    if (code >= 56000 && code <= 56100) return { lat: 3.1070, lng: 101.7280 }; // Cheras
    if (code >= 52100 && code <= 52200) return { lat: 3.2181, lng: 101.6366 }; // Kepong
    if (code >= 53000 && code <= 53300) return { lat: 3.1904, lng: 101.7107 }; // Setapak / Wangsa Maju
    if (code >= 57000 && code <= 57100) return { lat: 3.0585, lng: 101.6917 }; // Bukit Jalil / Sri Petaling
    return { lat: 3.1390, lng: 101.6869 }; // Central KL
  }

  // Negeri Sembilan (70000 - 73509)
  if (code >= 70000 && code <= 73509) {
    if (code >= 71000 && code <= 71150) return { lat: 2.5228, lng: 101.7959 }; // Port Dickson
    if (code >= 71800 && code <= 71809) return { lat: 2.8125, lng: 101.7972 }; // Nilai
    return { lat: 2.7258, lng: 101.9424 }; // Seremban
  }

  // Melaka (75000 - 78309)
  if (code >= 75000 && code <= 78309) {
    if (code >= 78000 && code <= 78309) return { lat: 2.3833, lng: 102.2083 }; // Alor Gajah
    return { lat: 2.1896, lng: 102.2501 }; // Melaka City
  }

  // Johor (80000 - 86900)
  if (code >= 80000 && code <= 86900) {
    if (code >= 81300 && code <= 81310) return { lat: 1.5300, lng: 103.6260 }; // Skudai / Taman Universiti
    if (code >= 83000 && code <= 83999) return { lat: 1.8548, lng: 102.9325 }; // Batu Pahat
    if (code >= 84000 && code <= 84999) return { lat: 2.0442, lng: 102.5689 }; // Muar / Tangkak
    if (code >= 85000 && code <= 85400) return { lat: 2.5148, lng: 102.8158 }; // Segamat
    if (code >= 86000 && code <= 86900) return { lat: 2.0251, lng: 103.3328 }; // Kluang / Mersing
    if (code >= 81000 && code <= 81900) return { lat: 1.6601, lng: 103.6032 }; // Kulai / Skudai / Pasir Gudang
    return { lat: 1.4927, lng: 103.7414 }; // Johor Bahru
  }

  // Labuan (87000 - 87033)
  if (code >= 87000 && code <= 87033) {
    return { lat: 5.2831, lng: 115.2308 };
  }

  // Sabah (88000 - 91309)
  if (code >= 88000 && code <= 91309) {
    if (code >= 90000 && code <= 90999) return { lat: 5.8394, lng: 118.1172 }; // Sandakan
    if (code >= 91000 && code <= 91309) return { lat: 4.2447, lng: 117.8912 }; // Tawau / Lahad Datu
    return { lat: 5.9804, lng: 116.0735 }; // Kota Kinabalu
  }

  // Sarawak (93000 - 98859)
  if (code >= 93000 && code <= 98859) {
    if (code >= 96000 && code <= 96900) return { lat: 2.2875, lng: 111.8305 }; // Sibu / Sarikei
    if (code >= 97000 && code <= 97300) return { lat: 3.1667, lng: 113.0333 }; // Bintulu
    if (code >= 98000 && code <= 98859) return { lat: 4.4148, lng: 114.0089 }; // Miri
    return { lat: 1.5533, lng: 110.3592 }; // Kuching
  }

  return null;
}

/**
 * Internal sync coordinate extraction
 */
function extractEmbeddedCoordinatesInternal(text: string): LocationCoordinates | null {
  if (!text) return null;
  const parsed = parseEmbeddedCoords(text);
  if (parsed && isReasonableCoordinates(parsed.lat, parsed.lng)) {
    return parsed;
  }
  return null;
}

/**
 * Extract direct latitude/longitude if coordinates or map URLs are embedded
 */
export async function extractEmbeddedCoordinates(text: string): Promise<LocationCoordinates | null> {
  return extractEmbeddedCoordinatesInternal(text);
}

/**
 * Internal sync location resolution via Malaysian postcode, landmark, city, or state
 */
function resolveLocationLocallyInternal(address: string): LocationCoordinates | null {
  if (!address || !address.trim()) return null;

  // 1. Check embedded coordinates
  const embedded = extractEmbeddedCoordinatesInternal(address);
  if (embedded) return embedded;

  const normalized = address.toLowerCase().replace(/[\r\n\t]+/g, ' ').trim();

  // 2. Extract 5-digit Malaysian postal code (e.g., 31900, 01000)
  const postcodeMatch = normalized.match(/\b([0-9]{5})\b/);
  if (postcodeMatch) {
    const coords = getCoordinatesFromPostcode(postcodeMatch[1]);
    if (coords) {
      const jitterLat = (Math.random() - 0.5) * 0.005;
      const jitterLng = (Math.random() - 0.5) * 0.005;
      const norm = normalizeCoordinates(coords.lat + jitterLat, coords.lng + jitterLng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
        return norm;
      }
    }
  }

  // 3. Match against known landmarks / major hubs (sorted by name length descending)
  const landmarkKeys = Object.keys(KNOWN_LANDMARKS).sort((a, b) => b.length - a.length);
  for (const landmark of landmarkKeys) {
    const regex = new RegExp(`\\b${landmark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(landmark)) {
      const coords = KNOWN_LANDMARKS[landmark];
      const jitterLat = (Math.random() - 0.5) * 0.004;
      const jitterLng = (Math.random() - 0.5) * 0.004;
      const norm = normalizeCoordinates(coords.lat + jitterLat, coords.lng + jitterLng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
        return norm;
      }
    }
  }

  // 4. Match against known towns & cities (sorted by name length descending for highest specificity)
  const townKeys = Object.keys(KNOWN_TOWNS).sort((a, b) => b.length - a.length);
  for (const town of townKeys) {
    const regex = new RegExp(`\\b${town.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(town)) {
      const coords = KNOWN_TOWNS[town];
      const jitterLat = (Math.random() - 0.5) * 0.006;
      const jitterLng = (Math.random() - 0.5) * 0.006;
      const norm = normalizeCoordinates(coords.lat + jitterLat, coords.lng + jitterLng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
        return norm;
      }
    }
  }

  // 5. Match against known states
  for (const [state, coords] of Object.entries(STATE_COORDINATES)) {
    const regex = new RegExp(`\\b${state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(state)) {
      const jitterLat = (Math.random() - 0.5) * 0.015;
      const jitterLng = (Math.random() - 0.5) * 0.015;
      const norm = normalizeCoordinates(coords.lat + jitterLat, coords.lng + jitterLng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
        return norm;
      }
    }
  }

  return null;
}

/**
 * Resolve location text locally via Malaysian postcode, landmark, city, or state
 */
export async function resolveLocationLocally(address: string): Promise<LocationCoordinates | null> {
  return resolveLocationLocallyInternal(address);
}

/**
 * Clean address query for Geocoding API lookup
 */
function cleanQueryForApi(raw: string): string {
  const cleaned = raw
    .replace(/^(?:no\.?|lot|unit|blok|tingkat|level)\s*[\w\d/-]+[^,]*,/gi, '') // Remove unit/house/lot prefix e.g. "No 20,"
    .replace(/^kedai\s+makan\s+/i, '')
    .replace(/^restoran\s+/i, '')
    .replace(/^warung\s+/i, '')
    .replace(/,\s*malaysia\s*,?\s*malaysia/gi, ', Malaysia')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Live geocode query via Komoot Photon API (high-speed, CORS enabled, OSM-backed)
 */
async function fetchPhotonGeocode(query: string): Promise<LocationCoordinates | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const encoded = encodeURIComponent(query.trim());
    // Biased around Malaysia (lat: 4.2105, lon: 101.9758)
    const url = `https://photon.komoot.io/api/?q=${encoded}&lat=4.2105&lon=101.9758&limit=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SkyelementsApp/1.0 (internal-sales-dashboard)',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.features && Array.isArray(data.features) && data.features.length > 0) {
        const feat = data.features[0];
        if (feat?.geometry?.coordinates && Array.isArray(feat.geometry.coordinates)) {
          const [rawLng, rawLat] = feat.geometry.coordinates;
          const norm = normalizeCoordinates(rawLat, rawLng);
          if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
            return norm;
          }
        }
      }
    }
  } catch {
    // Ignore network error and continue down ladder
  }
  return null;
}

/**
 * Fallback live geocode query via Open-Meteo Geocoding API (cities/districts)
 */
async function fetchOpenMeteoGeocode(query: string): Promise<LocationCoordinates | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const encoded = encodeURIComponent(query.trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=en&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SkyelementsApp/1.0 (internal-sales-dashboard)',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
        const item = data.results[0];
        const norm = normalizeCoordinates(item.latitude, item.longitude);
        if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
          return norm;
        }
      }
    }
  } catch {
    // Ignore network error
  }
  return null;
}

/**
 * Geocode an address string with high precision.
 * Uses local Malaysian postcode & geographic engine first (0ms), then Photon API ladder, then Open-Meteo fallback.
 */
export async function geocodeAddress(address: string): Promise<LocationCoordinates | null> {
  if (!address || !address.trim()) return null;

  // 1. Fast local resolution (handles all Malaysian postcodes, cities, states, landmarks, coordinates)
  const localMatch = resolveLocationLocallyInternal(address);
  if (localMatch) {
    return localMatch;
  }

  // 2. Build multi-tier search ladder
  const cleanAddr = cleanQueryForApi(address);
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

  const queriesToTry: string[] = [cleanAddr];

  // Try query without business name / first fragment if comma separated
  if (parts.length > 1) {
    const simplified = parts.slice(1).join(', ');
    queriesToTry.push(cleanQueryForApi(simplified));
  }

  // Try with explicit Malaysia suffix if not present
  if (!cleanAddr.toLowerCase().includes('malaysia') && !cleanAddr.toLowerCase().includes('singapore')) {
    queriesToTry.push(`${cleanAddr}, Malaysia`);
    if (parts.length > 1) {
      queriesToTry.push(`${parts.slice(1).join(', ')}, Malaysia`);
    }
  }

  // Try last 2 parts (usually district/city + state)
  if (parts.length >= 3) {
    queriesToTry.push(parts.slice(-2).join(', '));
  }

  // 3. Query Photon Geocoder API with fallback ladder
  for (const q of queriesToTry) {
    if (!q || q.length < 2) continue;
    const coords = await fetchPhotonGeocode(q);
    if (coords && isReasonableCoordinates(coords.lat, coords.lng)) {
      return coords;
    }
  }

  // 4. Query Open-Meteo API fallback (for area or city names)
  for (const q of queriesToTry) {
    if (!q || q.length < 2) continue;
    const coords = await fetchOpenMeteoGeocode(q);
    if (coords && isReasonableCoordinates(coords.lat, coords.lng)) {
      return coords;
    }
  }

  // 5. Final attempt: Extract any single token that matches known local towns/states
  const words = address.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (KNOWN_TOWNS[word]) {
      const coords = KNOWN_TOWNS[word];
      const norm = normalizeCoordinates(coords.lat, coords.lng);
      if (norm) return norm;
    }
    if (STATE_COORDINATES[word]) {
      const coords = STATE_COORDINATES[word];
      const norm = normalizeCoordinates(coords.lat, coords.lng);
      if (norm) return norm;
    }
  }

  return null;
}


/**
 * Autocomplete / search location suggestions for manual search UI
 */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || !query.trim() || query.trim().length < 2) return [];

  const normalized = query.toLowerCase().trim();
  const results: LocationSuggestion[] = [];

  // Helper to prevent duplicate nearby coordinates
  const isDuplicate = (lat: number, lng: number) => {
    return results.some(
      (r) => Math.abs(r.lat - lat) < 0.003 && Math.abs(r.lng - lng) < 0.003
    );
  };

  // 1. Match from Postcodes
  const postcodeMatch = normalized.match(/\b([0-9]{3,5})\b/);
  if (postcodeMatch && postcodeMatch[1].length === 5) {
    const coords = getCoordinatesFromPostcode(postcodeMatch[1]);
    if (coords && !isDuplicate(coords.lat, coords.lng)) {
      const norm = normalizeCoordinates(coords.lat, coords.lng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng)) {
        results.push({
          displayName: `${postcodeMatch[1]}, Malaysia`,
          lat: norm.lat,
          lng: norm.lng,
        });
      }
    }
  }

  // 2. Match from known Landmarks
  for (const [landmark, info] of Object.entries(KNOWN_LANDMARKS)) {
    if (landmark.includes(normalized) || normalized.includes(landmark)) {
      const norm = normalizeCoordinates(info.lat, info.lng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng) && !isDuplicate(norm.lat, norm.lng)) {
        const displayName = `${landmark.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}, ${info.state}, Malaysia`;
        results.push({
          displayName,
          lat: norm.lat,
          lng: norm.lng,
        });
      }
      if (results.length >= 3) break;
    }
  }

  // 3. Match from known Towns & Cities
  for (const [town, info] of Object.entries(KNOWN_TOWNS)) {
    if (town.includes(normalized) || normalized.includes(town)) {
      const norm = normalizeCoordinates(info.lat, info.lng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng) && !isDuplicate(norm.lat, norm.lng)) {
        const displayName = `${town.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}, ${info.state}, Malaysia`;
        results.push({
          displayName,
          lat: norm.lat,
          lng: norm.lng,
        });
      }
      if (results.length >= 5) break;
    }
  }

  // 4. Match from States
  for (const [state, coords] of Object.entries(STATE_COORDINATES)) {
    if (state.includes(normalized)) {
      const norm = normalizeCoordinates(coords.lat, coords.lng);
      if (norm && isReasonableCoordinates(norm.lat, norm.lng) && !isDuplicate(norm.lat, norm.lng)) {
        const displayName = `${state.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}, Malaysia`;
        results.push({
          displayName,
          lat: norm.lat,
          lng: norm.lng,
        });
      }
    }
  }

  // 5. Live Photon Komoot API Autocomplete Search (high precision & fast)
  if (results.length < 8) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const encoded = encodeURIComponent(query.trim());
      const url = `https://photon.komoot.io/api/?q=${encoded}&lat=4.2105&lon=101.9758&limit=8`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SkyelementsApp/1.0 (internal-sales-dashboard)',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.features && Array.isArray(data.features)) {
          for (const feat of data.features) {
            if (feat?.geometry?.coordinates && feat.geometry.coordinates.length >= 2) {
              const [rawLng, rawLat] = feat.geometry.coordinates;
              const norm = normalizeCoordinates(rawLat, rawLng);
              if (norm && isReasonableCoordinates(norm.lat, norm.lng) && !isDuplicate(norm.lat, norm.lng)) {
                const props = feat.properties || {};
                const nameParts = [
                  props.name,
                  props.street ? `${props.street}${props.housenumber ? ` ${props.housenumber}` : ''}` : undefined,
                  props.city || props.district || props.locality,
                  props.state,
                  props.country || 'Malaysia',
                ].filter(Boolean);

                const displayName = nameParts.length > 0 ? nameParts.join(', ') : `${query.trim()}, Malaysia`;
                results.push({
                  displayName,
                  lat: norm.lat,
                  lng: norm.lng,
                });
              }
            }
          }
        }
      }
    } catch {
      // Ignore network errors and return local matches
    }
  }

  return results.slice(0, 8);
}




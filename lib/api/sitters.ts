/**
 * Fetches validated babysitters from Supabase.
 * Falls back to MOCK_SITTERS when unauthenticated or when the table is empty.
 */
import { Role } from '../../models/types';
import { calculateDistance } from '../location-service';
import { MOCK_SITTERS, type MockSitter } from '../mock/sitters';
import { supabase } from '../supabase';

/**
 * Re-compute distanceKm for every sitter based on the user's real coordinates.
 * Call after getting the user's location.
 */
export function applyRealDistances(
  sitters: MockSitter[],
  userLat: number,
  userLon: number,
): MockSitter[] {
  return sitters.map(s => ({
    ...s,
    distanceKm: Math.round(calculateDistance(userLat, userLon, s.latitude, s.longitude) * 10) / 10,
  }));
}

function hashUUID(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = Math.imul(31, h) + uuid.charCodeAt(i) | 0;
  }
  return Math.abs(h) + 1000;
}

// Algiers neighbourhood coordinates — used when a sitter's DB row has no lat/lng yet.
const ALGIERS_COORDS: { lat: number; lon: number }[] = [
  { lat: 36.7510, lon: 3.0490 }, // Hydra
  { lat: 36.7917, lon: 3.0500 }, // Bab El Oued
  { lat: 36.7200, lon: 3.1000 }, // Kouba
  { lat: 36.7400, lon: 3.0500 }, // Bir Mourad Raïs
  { lat: 36.7500, lon: 3.0200 }, // El Biar
  { lat: 36.7500, lon: 2.9500 }, // Dely Ibrahim
  { lat: 36.7372, lon: 3.0869 }, // Centre
  { lat: 36.7600, lon: 3.0700 }, // Hussein Dey
  { lat: 36.7300, lon: 3.0600 }, // Ben Aknoun
  { lat: 36.7700, lon: 3.0300 }, // Cheraga
];

function fallbackCoords(uuid: string): { lat: number; lon: number } {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return ALGIERS_COORDS[Math.abs(h) % ALGIERS_COORDS.length];
}

function rowToMockSitter(row: any): MockSitter {
  const p = row.profile ?? {};
  return {
    id: hashUUID(row.profile_id),
    uuid: row.profile_id,
    firstName: p.first_name ?? '',
    lastName: p.last_name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    photo: p.photo_url ?? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600',
    role: Role.BABY_SITTER,
    createdAt: p.created_at ?? new Date().toISOString(),
    isVerified: p.is_verified ?? false,
    experience: row.experience ?? '1–2 years',
    hourlyRate: row.hourly_rate ?? 200,
    availabilities: [],
    averageRating: Number(row.average_rating) || 0,
    location: row.city
      ? `${row.city}, ${row.neighborhood ?? row.city}`
      : (row.neighborhood ?? 'Algeria'),
    isValidated: row.is_validated ?? false,
    identityVerified: row.identity_verified ?? false,
    neighborhood: row.neighborhood ?? 'Algiers',
    distanceKm: 0,
    reviewsCount: row.reviews_count ?? 0,
    bio: row.bio ?? '',
    languages: row.languages ?? [],
    specialties: row.specialties ?? [],
    responseMinutes: row.response_minutes ?? 30,
    govIdVerified: row.identity_verified ?? false,
    policeCheck: row.police_check ?? false,
    availableNow: row.is_available_now ?? false,
    // Use real DB coords if available; fall back to a neighbourhood spread
    latitude: row.latitude ?? fallbackCoords(row.profile_id).lat,
    longitude: row.longitude ?? fallbackCoords(row.profile_id).lon,
  };
}

export async function fetchSitters(): Promise<MockSitter[]> {
  try {
    const { data, error } = await supabase
      .from('babysitter_details')
      .select(`
        profile_id, bio, experience, hourly_rate, neighborhood, latitude, longitude,
        languages, specialties, response_minutes, is_validated, identity_verified,
        police_check, is_available_now, average_rating, reviews_count,
        profile:profiles!profile_id(id, first_name, last_name, email, phone, photo_url, is_verified, created_at)
      `)
      .eq('is_validated', true)
      .order('average_rating', { ascending: false });

    if (error || !data || data.length === 0) return MOCK_SITTERS;

    const realSitters = data.map(rowToMockSitter);
    const realIds = new Set(realSitters.map(s => s.uuid));

    // Merge: real sitters first, then mock sitters that don't have a real DB counterpart
    return [...realSitters, ...MOCK_SITTERS.filter(m => !realIds.has(m.uuid))];
  } catch {
    return MOCK_SITTERS;
  }
}

/** Look up a single sitter by mock integer id, UUID string, or Supabase profile_id. */
export async function fetchSitterById(id: string): Promise<MockSitter | null> {
  // Try mock first
  const mock = MOCK_SITTERS.find(s => String(s.id) === id || (s as any).uuid === id);
  if (mock) return mock;

  // Try Supabase by profile_id UUID
  try {
    const { data, error } = await supabase
      .from('babysitter_details')
      .select(`
        profile_id, bio, experience, hourly_rate, neighborhood, latitude, longitude,
        languages, specialties, response_minutes, is_validated, identity_verified,
        police_check, is_available_now, average_rating, reviews_count,
        profile:profiles!profile_id(id, first_name, last_name, email, phone, photo_url, is_verified, created_at)
      `)
      .eq('profile_id', id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToMockSitter(data);
  } catch {
    return null;
  }
}
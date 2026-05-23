/**
 * Fetches validated babysitters from Supabase.
 * Falls back to MOCK_SITTERS when unauthenticated or when the table is empty.
 */
import { supabase } from '../supabase';
import { MOCK_SITTERS, type MockSitter } from '../mock/sitters';
import { Role } from '../../models/types';

function hashUUID(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = Math.imul(31, h) + uuid.charCodeAt(i) | 0;
  }
  return Math.abs(h) + 1000;
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
    location: `Algiers, ${row.neighborhood ?? 'Algiers'}`,
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
    latitude: row.latitude ?? 36.7372,
    longitude: row.longitude ?? 3.0869,
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
    return data.map(rowToMockSitter);
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



-- Amina Khelifi
update public.profiles set role = 'BABY_SITTER', first_name = 'Amina', last_name = 'Khelifi',
  photo_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600'
  where id = '00000000-0000-0000-0000-000000000001';

insert into public.babysitter_details (
  profile_id, bio, experience, hourly_rate, neighborhood, city, latitude, longitude,
  languages, specialties, response_minutes,
  is_validated, identity_verified, police_check, is_available_now
) values (
  '00000000-0000-0000-0000-000000000001',
  'Former preschool teacher, trained in pediatric first aid. Calm and patient with curious toddlers.',
  '5+ years', 250, 'Hydra', 'Algiers', 36.7438, 3.0423,
  ARRAY['Arabic','French','English'],
  ARRAY['Toddlers','Homework help','Cooking'],
  7, true, true, true, true
)
on conflict (profile_id) do update set
  bio = excluded.bio,
  experience = excluded.experience,
  hourly_rate = excluded.hourly_rate,
  neighborhood = excluded.neighborhood,
  is_validated = excluded.is_validated,
  identity_verified = excluded.identity_verified,
  is_available_now = excluded.is_available_now;

-- Yasmine Benali
update public.profiles set role = 'BABY_SITTER', first_name = 'Yasmine', last_name = 'Benali',
  photo_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600'
  where id = '00000000-0000-0000-0000-000000000002';

insert into public.babysitter_details (
  profile_id, bio, experience, hourly_rate, neighborhood, city, latitude, longitude,
  languages, specialties, response_minutes,
  is_validated, identity_verified, police_check, is_available_now
) values (
  '00000000-0000-0000-0000-000000000002',
  'Education major at Alger 2 University. Loves reading and crafts with kids 4-10.',
  '3–5 years', 200, 'Bab El Oued', 'Algiers', 36.7925, 3.0515,
  ARRAY['Arabic','French'],
  ARRAY['School-age','Arts & crafts'],
  12, true, true, true, true
)
on conflict (profile_id) do update set
  bio = excluded.bio,
  hourly_rate = excluded.hourly_rate,
  is_validated = excluded.is_validated;

-- Fatima Zerrouki
update public.profiles set role = 'BABY_SITTER', first_name = 'Fatima', last_name = 'Zerrouki',
  photo_url = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600'
  where id = '00000000-0000-0000-0000-000000000003';

insert into public.babysitter_details (
  profile_id, bio, experience, hourly_rate, neighborhood, city, latitude, longitude,
  languages, specialties, response_minutes,
  is_validated, identity_verified, police_check, is_available_now
) values (
  '00000000-0000-0000-0000-000000000003',
  'Mother of two, nurse by training. Especially experienced with infants and night-time care.',
  '5+ years', 300, 'Kouba', 'Algiers', 36.7326, 3.0908,
  ARRAY['Arabic','French'],
  ARRAY['Infants','Overnight','First aid'],
  4, true, true, true, false
)
on conflict (profile_id) do update set
  bio = excluded.bio,
  hourly_rate = excluded.hourly_rate,
  is_validated = excluded.is_validated;

-- Nour Hadji
update public.profiles set role = 'BABY_SITTER', first_name = 'Nour', last_name = 'Hadji',
  photo_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'
  where id = '00000000-0000-0000-0000-000000000004';

insert into public.babysitter_details (
  profile_id, bio, experience, hourly_rate, neighborhood, city, latitude, longitude,
  languages, specialties, response_minutes,
  is_validated, identity_verified, police_check, is_available_now
) values (
  '00000000-0000-0000-0000-000000000004',
  'Psychology student, gentle and engaging with school-age children.',
  '1–2 years', 180, 'Bir Mourad Raïs', 'Algiers', 36.7394, 3.0634,
  ARRAY['Arabic','French','English'],
  ARRAY['School-age','Homework help'],
  18, true, false, true, true
)
on conflict (profile_id) do update set
  bio = excluded.bio,
  hourly_rate = excluded.hourly_rate,
  is_validated = excluded.is_validated;

-- Lina Messaoudi
update public.profiles set role = 'BABY_SITTER', first_name = 'Lina', last_name = 'Messaoudi',
  photo_url = 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600'
  where id = '00000000-0000-0000-0000-000000000005';

insert into public.babysitter_details (
  profile_id, bio, experience, hourly_rate, neighborhood, city, latitude, longitude,
  languages, specialties, response_minutes,
  is_validated, identity_verified, police_check, is_available_now
) values (
  '00000000-0000-0000-0000-000000000005',
  'Certified Montessori teacher. Specializes in early learning and bilingual homes.',
  '5+ years', 350, 'El Biar', 'Algiers', 36.7686, 3.0336,
  ARRAY['Arabic','French','English','Spanish'],
  ARRAY['Early learning','Montessori','Bilingual'],
  3, true, true, true, true
)
on conflict (profile_id) do update set
  bio = excluded.bio,
  hourly_rate = excluded.hourly_rate,
  is_validated = excluded.is_validated;


-- ---------------------------------------------------------------------
-- 2) Promote one user to ADMIN for testing
--    (paste any of your UUIDs here)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'ADMIN' where id = '00000000-0000-0000-0000-0000000000FF';
-- insert into public.admin_details (profile_id, access_level)
--   values ('00000000-0000-0000-0000-0000000000FF', 10)
--   on conflict (profile_id) do nothing;


-- ---------------------------------------------------------------------
-- 3) Seed an example booking (parent books Amina)
--    Replace '00000000-0000-0000-0000-0000000000AA' with a PARENT user's id.
-- ---------------------------------------------------------------------
-- insert into public.bookings (parent_id, babysitter_id, start_date, end_date, duration_hours, hourly_rate, status, children_count, age_band)
-- values (
--   '00000000-0000-0000-0000-0000000000AA',
--   '00000000-0000-0000-0000-000000000001',
--   now() + interval '3 days', now() + interval '3 days 3 hours',
--   3, 250, 'PENDING', 1, '3–6 yrs'
-- );

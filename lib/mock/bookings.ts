import type { Booking } from '../../models/types';
import { BookingStatus } from '../../models/types';

export interface MockBooking extends Booking {
  sitterId: number;
  sitterName: string;
  sitterPhoto: string;
  code: string; // human-friendly reference
}

export const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: 1, babySitterId: 1, parentId: 100, sitterId: 1,
    sitterName: 'Amina Khelifi',
    sitterPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    code: '328-047',
    startDate: '2026-03-28T09:00:00',
    endDate:   '2026-03-28T12:00:00',
    duration: 3, totalPrice: 800,
    status: BookingStatus.PENDING,
    createdAt: '2026-03-22T18:14:00',
  },
  {
    id: 2, babySitterId: 2, parentId: 100, sitterId: 2,
    sitterName: 'Yasmine Benali',
    sitterPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    code: '320-031',
    startDate: '2026-03-20T14:00:00',
    endDate:   '2026-03-20T18:00:00',
    duration: 4, totalPrice: 850,
    status: BookingStatus.CONFIRMED,
    createdAt: '2026-03-15T12:00:00',
  },
  {
    id: 3, babySitterId: 3, parentId: 100, sitterId: 3,
    sitterName: 'Fatima Zerrouki',
    sitterPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    code: '310-022',
    startDate: '2026-03-10T10:00:00',
    endDate:   '2026-03-10T14:00:00',
    duration: 4, totalPrice: 1250,
    status: BookingStatus.COMPLETED,
    createdAt: '2026-03-02T09:00:00',
  },
  {
    id: 4, babySitterId: 4, parentId: 100, sitterId: 4,
    sitterName: 'Nour Hadji',
    sitterPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    code: '305-015',
    startDate: '2026-03-05T16:00:00',
    endDate:   '2026-03-05T20:00:00',
    duration: 4, totalPrice: 770,
    status: BookingStatus.CANCELLED,
    createdAt: '2026-02-28T15:00:00',
  },
];

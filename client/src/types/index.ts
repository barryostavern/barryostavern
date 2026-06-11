export interface Event {
  _id: string;
  type: 'sports' | 'holiday' | 'shuttle' | 'community';
  title: string;
  description: string;
  date: string;
  timeLabel: string;
}

export type EventType = Event['type'];

export interface SiteSettings {
  announcement: {
    enabled: boolean;
    message: string;
    linkTarget: 'Events' | 'Christmas Party' | 'Menu' | 'Contact';
  };
  christmasParty: {
    enabled: boolean;
    title: string;
    date?: string;
    note: string;
    ticketUrl: string;
  };
  hero: {
    videoUrl?: string;
    posterUrl?: string;
  };
  hours: Array<{ label: string; value: string; order: number }>;
  contact: {
    address: string;
    phone: string;
  };
  about: string;
  instagram: {
    handle: string;
    showApprovedInGallery: boolean;
  };
}

export interface GallerySubmission {
  _id: string;
  submitterName: string;
  caption: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { count: number };
}

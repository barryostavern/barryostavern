import { useEffect, useState } from 'react';
import { getSiteSettings } from '../services/settings';
import type { SiteSettings } from '../types';

let cachedSettings: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    getSiteSettings()
      .then((data) => {
        cachedSettings = data;
        setSettings(data);
      })
      .catch(() => {
        setSettings(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { settings, loading };
}

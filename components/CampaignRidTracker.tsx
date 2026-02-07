"use client";

import { useEffect } from "react";
import { captureCampaignRidFromUrl } from "@/lib/analytics";

/**
 * Runs once on mount. If the URL has ?rid= (e.g. from campaign link www.onedaycap.com/?rid={{rid}}),
 * captures it, stores in sessionStorage, sets Amplitude user id to rid, and tracks "Campaign Link Visited".
 * Renders nothing.
 */
export function CampaignRidTracker() {
  useEffect(() => {
    captureCampaignRidFromUrl();
  }, []);
  return null;
}

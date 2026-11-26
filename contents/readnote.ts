import type { PlasmoCSConfig } from "plasmo"

import "../src/content/content"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

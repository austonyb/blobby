# Changelog

## 0.2.0

- Video and audio preview use short-lived signed Blob URLs so playback can start and seek without downloading the whole file
- File proxy forwards HTTP Range (206) as a fallback
- Sort the current folder by name, size, or date (kept in the URL)
- Header logo (mark + Blobby)
- Theme picker: Light, Dark, System, Tokyo Night, Catppuccin, Peach

## 0.1.0

First release.

- Private Vercel Blob file browser (list, preview, upload, folder, rename, delete)
- Sticky preview pane; `.config` hidden from the UI and APIs
- Cookie auth with users stored at `.config/auth/users.json`
- First-run admin setup
- Admin invite links (one-time, 7-day, no email)

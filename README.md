# VOLTORA – Electronics Repair, Service & Staff Management System
*Version 3 – extends the IMS566 Staff & Task Manager (v2). Individual project, Iqbal, UiTM.*

Front-end prototype (HTML5, CSS3, vanilla JavaScript, Bootstrap 5). All data is fictional and lives in the browser (`localStorage`), so it runs on **GitHub Pages** with no server.

- Live website: `https://USERNAME.github.io/REPOSITORY/`  <- replace after publishing
- Repository: `https://github.com/USERNAME/REPOSITORY`  <- replace after publishing

## What is new in v3
| Area | Summary |
|---|---|
| Services (public) | "Our Repair Services": 6 categories, **60 services** (icon cards, no pictures), search, working category filter, detail modal, price/duration disclaimers |
| Repair request | Validated form, pickup or delivery (conditional fields), unique ID `VR-YYYY-NNNN`, saved as a request + repair job, waits for manager review |
| Track repair (public) | Repair ID **plus** the contact number used on the request, status timeline, 5 wrong attempts = 30 s lockout |
| Repair Management (admin) | Table with search, sort, filters, chips, CSV export; review, approve, reject, assign, update estimates, record fulfilment, payments, costs |
| Staff | Assigned repairs appear on the dashboard and as normal tasks; staff update status, progress, remarks and complete the repair |
| Dashboard / Finance / Reports / Profile | Repair KPIs and 5 repair charts, repair finance, repair report with CSV, repair stats on the staff profile |
| Service Catalogue (admin) | Add / edit / hide / delete services and categories, price and duration placeholders |
| Appearance | Dark / Light / System, 8 accent palettes, Restore Default, live preview (Settings) |
| Motion | GSAP + ScrollTrigger (hero, reveals, counters, modal), mo.js burst on request success; `prefers-reduced-motion` respected |
| Notifications | In-app only, per role. **No email or SMS is sent.** |

## Repair workflow
1. Customer submits a request on `services.html` -> status **New Request**, fulfilment method recorded.
2. Manager opens it in **Repair Management**: *Under Review*, then **Approve** (optional approved price, duration, priority, due date, technician) or **Reject/Cancel** (reason kept in history).
3. Assigning a technician creates **one task** in the existing task system (linked by `repairId`). Before that the repair is *Pending Assignment* and has no task.
4. Technician sees it on the dashboard and in Tasks: *Assigned -> In Progress -> Waiting for Parts -> Quality Check -> Completed*. Changes from the task page and the repair page write through one function (`updateRepair`), so repair, task, history and notifications stay consistent. A repair is counted once in staff performance.
5. After completion, fulfilment status is handled separately:
   - Pickup: Available for Collection -> Collected Successfully
   - Delivery: Delivery Requested -> Preparing for Delivery -> Out for Delivery -> Delivered Successfully (manual updates by staff; **no courier tracking is simulated**)
6. Customer follows the timeline on `track.html`.

Statuses: New Request, Under Review, Approved, Pending Assignment, Assigned, In Progress, Waiting for Parts, Quality Check, Completed, Cancelled.

### Near-real-time sync (honest description)
`Sync.watch` refreshes pages on the browser `storage` event (instant between tabs of the same browser) and by **polling every 10 seconds**. There is no server push. Because storage is per browser, a customer on another device would not reach this prototype's data; a real deployment needs a back end.

### Finance rules
Estimated quotation (placeholder range), approved price, payments received and repair costs (parts, delivery) are kept separate. Estimates are **never** counted as revenue; only recorded payments are.

## The 60 services
Prices (RM ranges) and durations are **editable placeholders**, not official prices or commitments. The admin can change them in *Services > Manage catalogue*.

**Smartphone Repair & Service**

1. Screen Replacement
2. Battery Replacement
3. Charging Port Repair
4. Camera Repair
5. Speaker Replacement
6. Microphone Repair
7. Power Button Repair
8. Back Glass Replacement
9. Water Damage Inspection
10. Software Troubleshooting

**Laptop Repair & Service**

1. Laptop Screen Replacement
2. Laptop Keyboard Replacement
3. Laptop Battery Replacement
4. Laptop Charging Port Repair
5. Laptop Hinge Repair
6. Laptop Fan Cleaning
7. Thermal Paste Replacement
8. SSD Upgrade
9. RAM Upgrade
10. Windows Installation

**Desktop PC & Gaming PC Service**

1. Custom PC Assembly
2. PC Hardware Troubleshooting
3. GPU Installation
4. CPU Installation
5. Motherboard Replacement
6. PC Dust Cleaning
7. PC Cooling System Installation
8. Power Supply Replacement
9. PC Cable Management
10. PC Performance Optimization

**Accessories & Peripheral Repair**

1. Mechanical Keyboard Repair
2. Mouse Repair
3. Headphone Repair
4. Earbuds Repair
5. Gaming Controller Repair
6. Monitor Repair
7. Printer Repair
8. USB Port Repair
9. External Hard Drive Troubleshooting
10. Wi-Fi Router Setup & Troubleshooting

**Software, Data & Other Electronic Services**

1. Software Installation
2. Antivirus Installation
3. Data Backup Service
4. Data Recovery Assessment
5. Driver Installation
6. Tablet Screen Replacement
7. Tablet Battery Replacement
8. Smartwatch Screen Repair
9. Smartwatch Battery Replacement
10. General Device Diagnostic

**Camera Repair & Service**

1. Camera LCD Screen Replacement
2. Camera Lens Repair
3. Camera Sensor Cleaning
4. Camera Shutter Repair
5. Camera Battery Replacement
6. Memory Card Slot Repair
7. Autofocus System Repair
8. Camera Flash Repair
9. Camera Firmware Update
10. Camera General Diagnostic

## Login for testing
Password for all demo accounts: **`Voltora@123`**

| Role | Email | Notes |
|---|---|---|
| Manager (role: Administrator) | `iqbal@voltora.my` (Iqbal Hakimi) | Everything, incl. Repair Management and catalogue |
| Staff | `adli@voltora.my` (Adli Harun) | Own tasks only |
| Repair technicians | `farid@voltora.my`, `jason@voltora.my` | See assigned repairs |
| Customer (read only) | `customer@voltora.my` (Jamal Ariffin) | Can only VIEW Dashboard, Tasks (no editing), Repair Management and Schedule, and edit own profile in Settings, and only for repairs requested with her own email/phone. Technician names, costs and internal notes are hidden. New registrations are customer accounts. |

Visitors can still request repairs without logging in (`services.html`) and use `track.html`. Access control is enforced in the browser only (static site, localStorage), so it demonstrates the workflow but is not real security.

## Install / run
Open `index.html` through any static server (VS Code Live Server, `python -m http.server`) or upload to GitHub Pages. Needs internet for the CDN libraries below. "Reset demo data" in Settings restores sample data and keeps your theme.

## Data structure (localStorage, prefix `vt_`)
`users`, `staff`, `tasks` (repair tasks carry `repairId`), `expenses`, `notes`, `roster`, `activity`, `services`, `svcCats`, `rq` (repair requests), `rj` (repair jobs: status, staff, due, progress, payments, costs), `rf` (fulfilment), `rh` (history), `repair_photos` (customer photos, one entry per repair), `theme`, `accent`. Data version `DATA_VERSION = 6`.

## Libraries and licences
Bootstrap 5.3.3 (MIT), Bootstrap Icons 1.11.3 (MIT), Chart.js 4.4.3 (MIT), GSAP 3.12.5 + ScrollTrigger (GreenSock Standard "no charge" licence), mo.js 1.7.1 (MIT), bundled fonts Plus Jakarta Sans and Sora (SIL OFL 1.1, served from `assets/fonts/`).
**Particles** by Luis Manuel for Codrops (https://github.com/codrops/ParticleEffectsButtons, 2018) and **anime.js 3.2.2** by Julian Garnier (MIT) are bundled unchanged in `js/vendor/` for the button particle effect; see `js/vendor/CREDITS.txt`. Codrops allows personal and commercial use but not reselling or redistributing the library as-is, so it is credited here and kept inside this project only.
The GitHub repo `mrchandrayee/button-label-animations` could not be opened (the site blocks automated reading), so its code was **not** used; the rolling button label in `js/btnfx.js` is an original implementation. Send the repo as a zip if you want it adapted.
Three.js and Lottie were **not** added: the same depth and motion is produced with GSAP + ScrollTrigger, canvas particle fields and CSS keyframes, which keeps the site light (no extra megabyte of library) and working offline.
**Huashu Art Motion** was evaluated but **not installed**: it needs uv/ffmpeg/Playwright Chromium and its demo assets and characters are excluded from reuse. Only the general idea (staged, purposeful motion) was followed. All Voltora visuals are original.

## Design reference
Layout and mood reference: https://jomor-design-2019.webflow.io/ (dark hero stage, large uppercase headings, outline text, duotone imagery, vertical captions, ring CTA). Re-implemented from scratch with Voltora colours; no Jomor code or assets were copied.

## Images and credits
- **Category banners:** each of the 6 service sections opens with one banner photo supplied by the project owner, optimised to 1280px WEBP (`assets/banners/smartphone|laptop|desktop|accessories|software|camera.webp`, about 70-90 KB each).
- **Service cards** still use Bootstrap Icons, not photos.
- Other pictures are the supplied Voltora logo (`assets/logo/`) and three original SVG illustrations (`assets/images/*.svg`).
- **Customer photos:** pictures attached to a repair request are resized to 1000px and re-encoded as JPEG in the browser, then kept in `localStorage` under `vt_repair_photos`. They never leave the device.

## Look and feel (v3.1)
- **macOS style:** translucent sidebar and toolbar ("vibrancy" blur), rounded macOS buttons, inputs, sheets and menus, SF-style look using the bundled Plus Jakarta Sans (text) and Sora (headings) fonts (SIL OFL 1.1, files in `assets/fonts/`, no Google request) on non-Apple devices). The three coloured dots above the sidebar logo are decoration only.
- **Whole-site colour in one click (signed-in only):** after login, a row of 8 colour dots sits in the top bar of every page, so the whole site changes colour without opening Settings. Visitors on the home, services, track and login pages do not get the colour tools (the full-screen button stays). The palette button beside it opens the same choices with their names, and is the only control shown on narrow screens. It tints the entire site (background, sidebar, hero, cards, charts) from 8 palettes. Saved in the browser and shown in Settings > Appearance. Pages with charts reload once so charts pick up the colour.
- **Full screen:** the expand button in the top bar uses the browser Fullscreen API (hidden if the browser does not support it, e.g. iPhone Safari).
- **Motion layer (`js/motionfx.js` + `css/motion.css`):** branded loader on the first visit, scroll progress bar, back-to-top button, scroll reveals with stagger, KPI numbers counting up when they come into view, parallax on the category banners, headings that assemble word by word, magnetic buttons, card tilt, click bursts, modal pop-in and a soft page-to-page transition. A sweep makes sure nothing ever stays invisible if a list redraws while you scroll.
- **Button effects (`js/btnfx.js`):** primary buttons (Login, Request Service, Submit request, ring buttons) burst into particles and re-form using Particles + anime.js. A visual copy is animated on top, so forms and layouts are never touched; the effect is skipped on very slow devices and for reduced motion. Normal buttons get a rolling label on hover.
- **Customer settings:** customers now have Settings like manager and staff: change name, phone and password, and appearance. Email is fixed. Repairs are linked to the email or phone number, so keep the phone number the same as on your requests.
- **Login wording:** every "Staff login" is now just "Login".
- **Photo attachments:** the repair request form takes up to 3 photos by click or drag and drop, with thumbnails and remove buttons. The manager sees them in Repair Management; the customer sees their own in My Repairs.
- **Motion graphics (not charts):** drifting particles with links and slow hexagons reacting to the pointer, moving aurora background, orbit rings, scrolling category marquee, card spotlight and tilt, button ripple, floating icons. All paused for `prefers-reduced-motion` and the "Reduce motion" setting; canvases pause when off screen or when the tab is hidden.
- **No scrollbars or scroll indicators:** scrollbars are hidden everywhere and the hero scroll line was removed. Pages still scroll with wheel, touch, keyboard and trackpad.
- **Footer:** every footer now names **Voltora Store** in a disclaimer: fictional store, demo data kept in the browser, prices and durations are placeholders.

## Security and privacy (limits)
Input validation, role-based page guard, tracking needs ID + contact number, staff only see their own repairs, public pages never list other customers. This is a **static app**: roles and the tracking check run in the browser and can be bypassed by someone with developer tools, passwords use a salted client-side hash for demo only, and prepared statements do not apply because there is no SQL database. A real system needs server-side auth and a database.

## Tested
Automated browser run (Chromium, scripted): full customer -> manager -> technician -> delivery -> tracking flow, service search/filter, no images or scrollbars on Services, particle canvases present, colour popover and fullscreen button (top bar, public, login and landing pages), colour persisted and shown in Settings, footer disclaimer, dark/light and accent persistence, no horizontal overflow at 390 px on seven pages, reduced-motion check, zero console errors. **Not tested:** real devices, Safari/Firefox, screen readers, multi-device sync, GitHub Pages hosting, performance on low-end phones (particles and blur effects can be heavy; turn on Reduce motion in Settings if slow).

## Earlier v2 features
Authentication, staff management, task management, schedule, store expenses, reports and settings are kept from v2 (see the files in `js/`).

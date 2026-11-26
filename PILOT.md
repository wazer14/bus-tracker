# Pilot acceptance checklist (before real drivers)

Use synthetic test accounts only until every box is ticked.

## Technical
- [ ] One representative Android phone, walk test with the app open: position, speed, battery, km and moving/stopped update on the admin map.
- [ ] Lock the screen / switch apps: the map must show "no connection" with the last-seen time. It must never show "stopped" because GPS went quiet.
- [ ] Reopen the app: tracking recovers on its own.
- [ ] Web geolocation does NOT deliver updates to a locked or backgrounded phone. Continuous screen-off tracking is unproven. If dispatch needs it, that is a separate decision (native app or vehicle telematics).
- [ ] Shift start/end and overtime use server timestamps only. They never depend on GPS being live.
- [ ] After "تسليم الباص": the phone stops sending location, the server refuses position posts, the stored position is deleted, and the map shows the driver as off shift with no location.
- [ ] Unauthenticated calls to every /api route (except login/health) fail. A driver token cannot read the fleet or reports.
- [ ] Login lockout works (5 wrong tries, 15 minutes).

## Before real use (needs the company's decision)
- [ ] Driver notice and consent (what is collected, when, who sees it).
- [ ] Who is authorized to view the live map and reports.
- [ ] Location retention period and deletion process.
- [ ] Review against Saudi SDAIA / PDPL privacy notice guidance.

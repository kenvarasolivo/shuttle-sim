# Shuttle simulator UI review

Direction: Framed sheet, seed 648438311. Kept the existing green palette, bundled IBM Plex Sans, static HTML/CSS/JavaScript stack, and simulation model. No redraws and no inspector allowances.

## Product and design intent

- Objects: scheduled buses, eight-seat shuttles, stops, queues, passengers, planned routes.
- Network: Hbf plus 3?10 synthetic cities; existing distances remain the source of truth.
- Fleet: 0?10 shuttles; occupancy comes from the current simulation snapshot.
- Demand: seeded shared arrivals, including manually booked journeys.
- Time: playback, minute snapshots, interpolation, scrubbing, and full-run reports.
- Outcomes: matched journey averages, queues, completed trips, punctuality.
- Audience: someone exploring rural transport scenarios on desktop or phone.
- Main job: set network, fleet, demand; run and compare the two systems.
- Main question: how do the same passengers fare under the two transport models?
- Face: rural green-grey frame with the existing transport green on data.
- Signature: paired network schematics with distinct buses and minibuses.
- Idea: the shared Hbf-and-village network becomes a side-by-side transport experiment.

The live element is the existing working simulator. No sample data was added; geography, demand and timetables remain explicitly synthetic. Vehicle illustrations are original SVG artwork, not generated photographs. No external images, stock assets, new fonts, or dependencies were added.

## ROUND 1

Seen in one second: a transport comparison with clear controls and recognizable vehicles.
Idea (one sentence): the same village network carries two visibly different transport systems.
Live thing: run settings, scrub time, follow vehicles, filter stops, test a journey.
Layout words by section: summary=compact comparison / controls=single setup row / simulation=paired maps / evidence=queues and waiting chart / passengers=table.
Scores: design 7.5 ? usability 7.5 ? creativity 7 ? content 8 ? overall 7.5.
Caps applied: none; app-screen rules apply.
Top three problems:
1. Tablet title actions were hidden by an inherited media rule (tablet-fold). Restore both actions.
2. Phone passenger details required sideways scrolling (mobile-page-01). Reflow rows with both wait/total comparisons and status visible.
3. Small vehicle lights added irrelevant chart hues (all map screenshots). Use neutral window colour for lights.

## ROUND 2 ? final

Seen in one second: a rural shuttle simulator with one comparison and one run action.
Idea (one sentence): the same village network carries two visibly different transport systems.
Live thing: simulator, booking, playback and stop filtering remain functional.
Layout words by section: summary=compact comparison / controls=setup row / simulation=paired maps / evidence=queues and chart / passengers=desktop table, phone journey list.
Scores: design 7.7 ? usability 8 ? creativity 7 ? content 8 ? overall 7.7.
Caps applied: none; app-screen rules apply.
Remaining limitations:
1. At 390px the maps follow the comparison and settings below the first viewport; controls remain readable rather than compressed.
2. Large networks still share a schematic and can have closely spaced vehicles; this is not a geographic navigation map.
3. Table detail remains internally scrollable on tablet; the phone gets a dedicated list layout.

## Verification

- Before inspector at 1440 / 768 / 390: 0 failures, 1 warning (55px KPI).
- Final inspector at 1440 / 768 / 390: 0 failures, 0 warnings.
- Opened all six final screenshots: fold and complete-page contact sheet at every width.
- Source lint: 0 failures, 2 warnings. Clock zero-padding and em dashes for unavailable values are intentional, existing data formatting.
- 20 simulation tests passed; JavaScript syntax check passed.
- Existing browser interaction suite: 23 checks passed, including playback, scrubbing, filters, dialogs, booking validation, zero demand/fleet, end results and both exports. No console errors.
- Report suite: 10 checks passed, mobile overflow absent, negative/empty results preserved. No console errors.
- Motion checks passed for interpolation, paused positions and reduced-motion snapshots.

# Verification — Dorflinie Bus

The current product name is Dorflinie Bus. The interface, browser title, report labels, CSV headers/filenames, package and launch message use the new name. The model explanation explicitly scopes this simulation to buses and distinguishes the separate Dorflinie Car service. Historical validation notes below retain the name used when those checks were recorded.

## Simplified UI, ten shuttles and report headline

The new `report.test.mjs` ran RED with three failures: the engine rejected a fleet of ten, and paired results did not provide headline means or percentages. Checkpoint `34ffc1f` preserves these tests; `b50ccee` implements the tested engine change. The final suite passes **20/20 tests**, with **100% engine line coverage and 99.60% branch coverage**. Added guarantees: fleet ten succeeds while eleven is rejected; scheduled/ Landlink headline means, difference and percentage use precisely the same completed passengers; negative differences remain negative; empty cohorts produce null metrics.

The UI now uses one primary question and no sidebar: a top journey comparison, three core setup fields, and timing/capacity controls behind a disclosure. City bounds remain 3–10 plus Hbf; shuttles are independently 0–10. The main figures use matched cohorts and the detailed table labels its all-completed journey average explicitly. Report view moves to the full horizon, pauses, hides interactive detail and transient notifications, and retains scenario metadata and unserved counts. Summary CSV has 24 lines including headline/cohort fields.

The report browser check passes ten assertions plus desktop/mobile visibility, no overflow, negative/red and empty/neutral states, with no JavaScript exceptions. Default full-run headline: **51.4 scheduled vs 39.8 Landlink minutes, 11.6 minutes / 22.6% shorter**, based on the same 28 completed passengers. These are rounded values from the same cohort, not the different per-system completed groups. The 23 existing interaction checks, 12 network checks, shrink/mobile checks and smooth/reduced-motion checks also pass.

Visual QA records the prior screen in `.taste-skill/before-simple` and reviews desktop/tablet/mobile and report screenshots. The green-grey palette, bundled IBM Plex Sans and subject-specific paired network maps are retained; the report comparison is now the signature element. The design inspector passes at 1440/768/390px with **0 failures and 0 warnings using `--allow kpi-size`**. The single exception is deliberate: the user explicitly requested prominent figures for report screenshots, so headline numbers are 55px (64px in desktop report view), exceeding the app skill's usual KPI size guidance. Counts and other data remain normal size. Report mode also hides notifications so immediate screenshots are clean.

## Expandable city network

The new `network.test.mjs` first failed because `createNetwork` did not exist; checkpoint `bfbb62d` preserves this RED state. After implementation, **17/17 engine tests pass**, with **98.60% line coverage and 99.58% branch coverage**. The additional tests cover deterministic 3/4/7/10-city networks, positive symmetric roads, unchanged original distances and stable existing roads while adding cities, valid travel times, demand at all eleven stops, capacity/passenger conservation, added-city-to-added-city delivery, invalid stop rejection, and independent runs without shared mutable network state. Total arrival count is unchanged by city count when seed and demand are fixed.

The network browser check passes 12 checks plus mobile and shrink assertions: Add city, ten-city maps and queues, eleven booking stops, fixed fleet/total demand, booking City J to City D, updated final results and resource explanation, exports with new city names, maximum/minimum limits, and returning to the original network. There were no JavaScript exceptions or page overflow at 390px. All 23 existing browser checks also pass. The summary export now has 20 lines including metadata for city count, demand and shuttle fleet.

Desktop and phone screenshots of the ten-city network were reviewed. Stops fit in two rows around Hbf, and expanded queue lists scroll to avoid stretching the adjacent chart. Default-network design inspection passes at 1440/768/390px with no failures or warnings. The framed-sheet visual direction is retained. Adding cities is an experiment using synthetic distances and uniform village selection, not a validation against a real rural transport network.

## Smooth vehicle animation

The browser reproducer `.taste-skill/motion-check.mjs` first failed with “Vehicle does not move between minute snapshots.” The clock already advanced on animation frames, but the render function returned before updating vehicle positions between integer minutes. Markers now interpolate from departure to arrival along the same quadratic curve used by the road, with cached SVG references and transform updates only. A stable per-vehicle lane offset removes the previous sideways jump between parked and moving positions. The timeline now accepts fractional minutes.

The motion reproducer passes: inside minute 25 a scheduled marker moved from `translate(268.81,253.35)` to `translate(275.41,253.78)` while playback advanced to 25.27, and remained fixed while paused. Reduced-motion mode is checked separately. The existing 23 interaction checks and 13 engine tests pass. This is a presentation change; dispatch rules, passenger streams and final simulation outcomes are unchanged.

## End-of-run overview update

The summary extension was specified by three additional tests before implementation. `npm test` first failed because `resultStats` was not exported; checkpoint `85cb7c9` preserves that RED specification. After implementing the aggregation, **13/13 tests pass**, with **98.43% engine line coverage and 99.49% branch coverage**. The new tests prove waiting + onboard = journey time for completed travelers including scheduled transfers, each departed leg is counted once, empty legs are included, future timetable legs are excluded, seat utilization uses actual driving time, and unfinished passengers and null averages remain visible.

The browser check now reports **23 passing checks**, including automatically revealed final results, all 13 summary rows, clearing stale results after restart, Run to end, dispatch explanations and the 17-line summary CSV with definitions. No JavaScript exceptions or horizontal page overflow occurred. Final result screenshots were reviewed at desktop and mobile sizes; the mobile summary was changed to fit both scenario columns at once. The normal view inspector reports 0 failures and 0 warnings at 1440/768/390px. Existing style and synthetic-data limits remain as described below. A 100px tablet dispatch-description area keeps the paired scenario metrics and maps aligned.

Default seed-42/three-hour result: scheduled/shuttle average wait 30.76/16.66 min, onboard 19.15/22.31 min, total journey 49.91/38.97 min. These scenario averages have different completed cohorts (34/35); matched saving is separately calculated for the 28 passengers completed in both. No dispatch policy was changed: shuttles still react immediately to assigned requests, without a departure timetable or minimum load.

User journeys were derived from the request: compare rural transport with the same random passengers; observe queues, total journey times and arrival deadlines; explore an on-demand shuttle algorithm interactively; preserve the earlier app.

## Simulation evidence

The first `npm test` execution failed because the requested `dist/simulation.js` implementation did not yet exist (`ERR_MODULE_NOT_FOUND`). After implementation, the same six initial tests passed. Four additional tests cover timetable overflow, inter-village transfer wait, future-demand isolation and invalid inputs. The final run passes **10/10 tests**.

`node --experimental-test-coverage --test tests/*.test.mjs` reports simulation-engine coverage: **98.18% lines, 99.42% branches, 97.06% functions**. This covers the simulation engine, not DOM rendering or the development server. The uncovered engine lines are `pairedSavings`, exercised through the browser checks instead.

Guarantees include deterministic arrivals and routing, the same passenger cohort in both systems, all four origins, valid deadlines, conservation of waiting/onboard/delivered counts at every snapshot, finite seat capacity, pickup before dropoff, honest empty states and visible queues under constrained capacity. Timetable transfers include waiting, capacity spillovers use later departures, future requests do not change earlier shuttle decisions, and average journey time excludes unfinished trips.

No Git checkpoint commits were created during the initial TDD cycle because the workspace was not a Git repository. Sites source synchronization creates a separate repository for the new simulator only.

## Browser evidence

The headless browser check `.taste-skill/browser-check.mjs` completed with `status: PASS`, 16 interaction checks, no JavaScript exceptions, no horizontal page overflow at 390px and advanced mobile controls visible on expansion. It exercises playback pause, scrubbing, computed savings, stop filters, the assumptions dialog, manual journey validation and addition, seeking to the added passenger, zero-demand reset, zero-fleet queues, reset, end-of-run seek, and CSV generation. The default CSV contained 111 lines including its header: 55 passengers in each scenario.

Browser automation used the design skill's installed headless Chrome adapter. The separate visible browser-control host was unavailable; no claim is made that a user-visible browser tab was opened. CSV content was inspected through a captured Blob without writing to Downloads.

The design inspector passes at **1440, 768 and 390 px, with 0 failures and 0 warnings**. All six desktop, tablet and mobile fold/page screenshots were opened for review. The first pass identified small secondary labels and one low-contrast label. Both were corrected. Advanced controls were restored behind a mobile disclosure, map labels enlarged and desktop map height reduced to expose stop/trend headings sooner.

## Design critique

Direction: framed-sheet, seed 1208793503; no redraw. Face: a rural green-grey frame with a drawn Landlink road mark. Signature element: the same Hbf/A/B/C network repeated for both transport systems, with actual queues and vehicle loads.

The screen's question is whether a chosen shuttle fleet improves this demand stream. Queue counts and completed journey figures are the largest numbers, with a matched-cohort savings figure nearby. Panel edges and paired metrics align. Green marks shuttle routes and status; grey marks the baseline. Shared passenger counts, queue totals and completed-trip denominators are computed from the same snapshots. Missing estimates are dashes or explicitly unassigned; zero remains zero. Legends match the actual route and chart marks. Phone screens stack the scenarios and keep advanced settings accessible. The passenger table intentionally scrolls horizontally on narrow screens.

Remaining limits: schematic map labels are necessarily compact, the mobile comparison requires scrolling, and future real-world validation is outside this prototype. Demand, distances, speeds, deadlines and schedules must be calibrated before using results for operations. There is no equal-cost, emissions or optimality claim.

## Preserved project

The cooling app's files were moved to `../hot attic folder`, with the Python environment retained at the workspace root to preserve its executable paths. The editable package was repointed using `pip install --no-deps -e './hot attic folder'`. Running `..\.venv\Scripts\python -m pytest -q` from the archive passes **119 tests**.

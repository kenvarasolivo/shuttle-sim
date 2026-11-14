# Verification — Landlink

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

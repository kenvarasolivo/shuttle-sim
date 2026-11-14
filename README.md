# Landlink — Rural mobility lab

A browser-local interactive simulation comparing scheduled buses with deadline-aware, demand-responsive rural shuttles. Synthetic Hbf, City A, City B and City C receive identical random passenger streams in both scenarios. There is no affiliation with FlixBus or Amazon.

## Run

Node 22+; no packages or network services required after downloading the source:

```powershell
cd shuttle-sim
npm run dev
```

Open http://localhost:5173. `PORT` overrides the local server port. Deployment uses the buildless static files in `dist/`.

## Explore

- The opening preview begins at 08:45. Restart returns to 08:00. Pause, scrub, and choose 1×, 3× or 10× playback.
- Change demand, train waves, timetable frequency, fleet size, seats, flexibility, horizon or random seed, then select **Apply & restart**. Applying or resetting clears manually added journeys.
- On smaller screens, **More settings** reveals all scenario controls.
- **Test a journey** adds a passenger with a chosen origin, destination, stop-arrival time and arrival deadline to both systems. Playback pauses at that passenger's arrival. Stop selection filters origins, not destinations.
- Click a map stop or queue row to filter the passenger list. The list also supports active, completed and at-risk trips and pagination.
- **Export trips** downloads the full run, including trips not completed inside the horizon. All times in the CSV are minutes after 08:00. It is not a current-time snapshot. Baseline bookings beyond the horizon remain forecasts and are flagged as not completed.
- **Run to end** jumps to the final comparison. The overview also appears automatically at the end and includes average wait, onboard and total journey time, 90th-percentile wait, passengers per ride leg, seat utilization, empty departures, on-time rate, completed journeys, remaining riders and peak queue. **Download summary** exports values and their definitions.

Scheduled buses leave on their timetable, including empty departures. On-demand shuttles have no departure clock, batching window or minimum passenger load: they leave for an assigned request as soon as available, spend a minute on each pickup/dropoff, and continue along their planned stops. A single passenger can trigger departure. Idle shuttles remain where their last request ended. Deadlines influence the chosen route; they do not set a scheduled departure time.

In the summary, a ride leg is a vehicle departure between two different stops. Average passengers per leg is the mean load at departure, including empty trips and legs still underway at the cutoff. Seat utilization is passenger-minutes / available seat-minutes while actually driving, clipped to the simulation window. Neither is the number of unique customers served by a whole multi-stop shuttle tour. Waiting + onboard time = total journey time for the completed cohort; scheduled transfer waits are included in waiting.

## Model

Defaults: 24 people/hour, seed 42, 180 minutes, three eight-seat shuttles, three hourly scheduled lines with 30 seats per departure, speed 35 km/h. Road distances and timetables are synthetic; the map is schematic. Arrival counts are Poisson by minute. The model uses 60% Hbf origins, plus village-to-Hbf and village-to-village demand. Deadlines equal direct-drive time + flexibility + a seeded 0–10 minutes. The wave-mode multiplier averages to 1 over each full half hour.

Scheduled services run Hbf–village–Hbf, with departures staggered by one third of the headway. Capacity overflows move to the next departure. Inter-village trips transfer at Hbf with at least two minutes between buses. With short headways the timetable can require overlapping physical buses; this is not an equal-fleet or equal-cost comparison.

Shuttles use online pickup/dropoff insertion. Every minute the planner orders pending requests by deadline and waiting age, tries all feasible insertions across the fleet and keeps the smallest incremental cost: `route duration + 0.25 × sum(journey minutes) + 20 × sum(late minutes)`. Capacity is checked on every route leg; pickups precede dropoffs; the next stop is locked while driving. Existing stop order stays intact. Every stop event takes one minute, including separate passenger events at the same location. Routes are limited to 20 stop events. Unassigned passengers are retried each minute. There is no lookahead at future requests and no optimality or punctuality guarantee.

Each system's average journey and on-time rate include its completed trips only. The headline saving uses the same passengers completed in both systems, avoiding a comparison of different completed cohorts. Queues include transfers waiting at Hbf. Stop ETA is the mean remaining time to destination for waiting riders with assigned routes; `+ ?` means some riders have no route yet. This is a planned estimate that may change. The current passenger list shows planned wait and total journey time, not fabricated predictions for unassigned passengers.

High demand can make an undersized fleet slower than buses. The dashboard deliberately shows queues, misses and negative savings. This is a concept and an exploration tool, not a calibrated forecast. Traffic, walking, driver hours, accessibility boarding, cancellations, fares, costs and emissions are not modeled. Real deployment decisions require local demand, road and timetable data.

## Checks

```powershell
npm test
node --check dist/app.js
```

Tests cover determinism, shared demand, passenger conservation, capacity, zero demand/fleet, spillover queues, scheduled transfer waits, route precedence, future-demand isolation, metric cohorts and invalid inputs. See [verification notes](docs/verification.md).

## Visual direction

Framed sheet, seed 1208793503, with a rural green-grey frame and a paired transport-network schematic as the signature element. IBM Plex Sans is bundled under the SIL Open Font License in `dist/FONT-LICENSE.txt`. All map artwork is drawn in the project; there are no external photographs or tracking requests. Passenger demand, all roads and all schedules are synthetic and are defined in `dist/simulation.js`.

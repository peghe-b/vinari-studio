# Photo library: sources and licences

41 photos for the `Photo` scene (`src/scenes/Photo.tsx`, `"src": "<file name without .jpg>"`).
Collected 2026-09-24 for the owner, who asked for a free stock of car photos "in case we need them".

## Licence

Every photo here is from **Unsplash** under the **Unsplash License**: <https://unsplash.com/license>.
In short: free to copy, modify and use, commercial use (ads included) allowed, no permission and no
attribution needed. Not allowed: selling a photo unaltered, or compiling Unsplash photos into a
competing photo service. Only free photos were taken: Unsplash+ (premium) and sponsored results were
filtered out by the API flags `premium`, `plus` and `sponsorship`.

The licence covers the photographer's copyright only. It is not a model or property release, so:
- no person's face is the subject of any photo here (hands only), and no photo should be cropped
  so that a stranger becomes recognisable;
- brand marks are small and incidental; do not push in on a badge (the notes below say where);
- licence plates that were readable at full size were softened with a feathered blur.

Credit is not required; the author column is kept so a credit can be given where it is polite
(a description, a website).

## Catalogue

`photos.json` lists every file with its pixel size, its mean luminance (`lum`, 0..1) and what it shows.
The `Photo` scene reads the size (to frame and place highlights) and `lum` (light strips on a dark
photo, dark strips on a light one). A new photo needs its line there, and its row below.

## Processing

Downloaded at 2400 px from the Unsplash CDN, cropped or softened where the notes say, resized to at
most 1600 px on the long side (Lanczos), saved as progressive JPEG q88 with no EXIF and no ICC profile
(the sources are sRGB). Colour is kept: the `Photo` scene grades them to the film's duotone itself.

## Files

| file | size | what it shows | author | source | notes |
|---|---|---|---|---|---|
| `brake-disc-caliper.jpg` | 1600×1067 | a brake disc and caliper, wheel off, dark | [Benjamin Brunner](https://unsplash.com/@ben_brunner) | [photo page](https://unsplash.com/photos/white-and-silver-round-device-al01Ad0f_KI) |  |
| `brake-disc-lift-portrait.jpg` | 1200×1600 | a brake disc and caliper on a lift, portrait | [The DK Photography](https://unsplash.com/@deepain108) | [photo page](https://unsplash.com/photos/gray-and-brown-round-metal-tool-fwnTOncjeB0) |  |
| `car-lift-garage.jpg` | 1600×1202 | a crossover on a scissor lift in a dark garage | [Hyundai Motor Group](https://unsplash.com/@hyundaimotorgroup) | [photo page](https://unsplash.com/photos/a-car-on-a-lift-in-a-garage-NjnftJ6_QCo) | uploaded by the maker's own Unsplash account; front badge and grille logo softened |
| `crash-front.jpg` | 1600×1067 | a crumpled front end: headlight, hood, radiator | [Clark Van Der Beken](https://unsplash.com/@snapsbyclark) | [photo page](https://unsplash.com/photos/damaged-silver-car-with-crushed-hood-CSkriQWeTVs) |  |
| `crash-tow-truck.jpg` | 1600×1067 | a damaged red car strapped onto a tow truck | [Usman Malik](https://unsplash.com/@usmanbim94) | [photo page](https://unsplash.com/photos/a-red-car-is-on-a-flatbed-tow-truck-kE__1vnDxg4) |  |
| `dash-check-engine.jpg` | 1600×1171 | the amber check-engine light on a dark cluster | [Compagnons](https://unsplash.com/@sigmund) | [photo page](https://unsplash.com/photos/analog-watch-at-1-00-TnEe6BdBC2M) |  |
| `dash-cluster-day.jpg` | 1600×1000 | a clean instrument cluster in daylight (odometer 35045) | [Cole Freeman](https://unsplash.com/@colefreeman) | [photo page](https://unsplash.com/photos/black-car-instrument-panel-cluster-OZqxw7_O0aA) |  |
| `dash-warning-lights.jpg` | 1600×900 | an instrument cluster at night, warning lights on | [McCarthy Beckan](https://unsplash.com/@mccarthybeckan) | [photo page](https://unsplash.com/photos/black-and-yellow-analog-speedometer-BKM4T2BLlFE) |  |
| `engine-bay-clean.jpg` | 1600×1067 | a stock petrol engine bay, hood up, top view | [BHARAT VISHAWAKARMA](https://unsplash.com/@bharat05) | [photo page](https://unsplash.com/photos/high-performance-car-engine-and-its-intricate-components-mQfymxsDALE) |  |
| `engine-bay-modern.jpg` | 1600×885 | a modern engine bay, dark, three-quarter view | [igor constantino](https://unsplash.com/@igoorconstantino) | [photo page](https://unsplash.com/photos/the-engine-compartment-of-a-car-with-its-hood-open-aXxu0nVMGmk) | top strip cropped off (a sponsor sticker) |
| `engine-carburetor.jpg` | 1600×1068 | an older engine: carburetor, red valve covers, dark | [Alex Marc Wagner](https://unsplash.com/@alexmarcwagner) | [photo page](https://unsplash.com/photos/a-close-up-of-the-engine-of-a-car-ZCGyXRnr4Uw) |  |
| `engine-smoke.jpg` | 1600×1068 | smoke rising over a car, black and white | [Valentin](https://unsplash.com/@omikron) | [photo page](https://unsplash.com/photos/smoke-billows-from-a-small-object-gNbOyZgYmaY) |  |
| `interior-cluster-ready.jpg` | 1600×1067 | a dark cockpit, the cluster reads READY | [Erik Nyberg](https://unsplash.com/@ensc) | [photo page](https://unsplash.com/photos/the-dashboard-of-a-car-in-the-dark-UrJDpWnwEj0) |  |
| `interior-wheel-portrait.jpg` | 1067×1600 | a steering wheel against a bright windshield, portrait | [Ivan Angelov](https://unsplash.com/@vancelot) | [photo page](https://unsplash.com/photos/black-steering-wheel-in-close-up-photography-3YfNCC1cnkk) |  |
| `keys-fob-dash.jpg` | 1600×1067 | a car key fob on a dashboard | [Bence Balla-Schottner](https://unsplash.com/@ballaschottner) | [photo page](https://unsplash.com/photos/black-key-fob-iTHT1gXJuS8) |  |
| `keys-ignition.jpg` | 1600×1067 | keys hanging from an ignition, dark | [Erik Mclean](https://unsplash.com/@introspectivedsgn) | [photo page](https://unsplash.com/photos/a-close-up-of-a-car-key-chain-PKwmiy1JafE) |  |
| `lot-new-cars-portrait.jpg` | 1199×1600 | rows of new cars at a terminal from above, portrait | [Ryan Searle](https://unsplash.com/@ryansearle) | [photo page](https://unsplash.com/photos/aerial-photography-of-parking-lot-k1AFA4N8O0g) |  |
| `mechanic-exhaust-hands.jpg` | 1600×1067 | hands fitting an exhaust gasket under a car, dark | [Martin Fennema](https://unsplash.com/@theartisdutch) | [photo page](https://unsplash.com/photos/a-man-working-on-a-cars-engine-with-a-wrench-nwSGKWYE9cM) |  |
| `mechanic-hands-engine.jpg` | 1600×1067 | two mechanics' hands working in an engine, dark | [BHARAT VISHAWAKARMA](https://unsplash.com/@bharat05) | [photo page](https://unsplash.com/photos/hands-working-on-go-kart-mechanics-oPQceS7Z2wQ) |  |
| `mechanic-wrench-dark.jpg` | 1600×1200 | a mechanic's hands with a wrench in an engine bay, dark | [Christian Buehner](https://unsplash.com/@christianbuehner) | [photo page](https://unsplash.com/photos/hands-working-on-car-engine-Fd6osyVbtG4) |  |
| `odometer-close.jpg` | 1600×1067 | an old speedometer's odometer drum close up (56947) | [Wesley Tingey](https://unsplash.com/@wesleyphotography) | [photo page](https://unsplash.com/photos/close-up-of-a-cars-odometer-showing-56947-miles-Nv1XM820_Io) |  |
| `parking-aerial-portrait.jpg` | 900×1600 | a parking lot from straight above, portrait | [stefzn](https://unsplash.com/@stefzn) | [photo page](https://unsplash.com/photos/an-overhead-view-of-a-parking-lot-filled-with-cars-JuCDZ5LfD_Q) |  |
| `parking-aerial-rows.jpg` | 1600×1280 | rows of parked cars from above, nearly monochrome | [Ink Spaces](https://unsplash.com/@inkandspaces) | [photo page](https://unsplash.com/photos/a-parking-lot-filled-with-lots-of-parked-cars-VL5b5b_7V40) |  |
| `port-cranes-grey.jpg` | 1600×1068 | a harbour with a container crane, grey morning | [Maksym Kaharlytskyi](https://unsplash.com/@qwitka) | [photo page](https://unsplash.com/photos/black-ship-on-sea-under-white-sky-during-daytime-sFq7vyCSFbM) |  |
| `port-ship-portrait.jpg` | 1067×1600 | a loaded container ship at dusk, portrait | [Christian Lue](https://unsplash.com/@christianlue) | [photo page](https://unsplash.com/photos/a-large-cargo-ship-in-the-ocean-with-a-tug-boat-nearby-jt_cLTbcdrk) | the operator's wordmark is small on the hull: do not push in on it |
| `rain-car-portrait.jpg` | 1067×1600 | a dark car's front in the rain, drops on the paint, portrait | [Arthur Hinton](https://unsplash.com/@arthurhinton) | [photo page](https://unsplash.com/photos/the-front-of-a-black-car-cJqJfFf1UWo) |  |
| `rain-windshield-night.jpg` | 1600×1067 | rain on a windshield at night, tail lights blurred | [Clay LeConey](https://unsplash.com/@clayleconey) | [photo page](https://unsplash.com/photos/water-droplets-on-glass-window--WMnuhSK7w4) |  |
| `sedan-studio-classic-portrait.jpg` | 1280×1600 | a classic coupe in a photo studio, lights visible, portrait | [Yuvraj Singh Parmar](https://unsplash.com/@ysp_19) | [photo page](https://unsplash.com/photos/a-black-and-white-photo-of-a-car-on-a-stage-Eylq_HRcFx4) |  |
| `sedan-studio-grey.jpg` | 1600×1600 | a grey sedan in a grey studio, three-quarter front | [Hyundai Motor Group](https://unsplash.com/@hyundaimotorgroup) | [photo page](https://unsplash.com/photos/a-car-is-shown-in-a-dimly-lit-room-mzeZvq_dSpE) | a small maker badge on the nose: keep the framing wide |
| `suv-studio-side.jpg` | 1600×900 | an SUV side view on a black studio floor | [ObjectType RAW](https://unsplash.com/@objecttyperaw) | [photo page](https://unsplash.com/photos/dark-blue-suv-parked-on-a-reflective-surface-8zZ9AiNWKoI) |  |
| `taillight-dark-portrait.jpg` | 1067×1600 | one tail light glowing in the dark, portrait | [Marcel Strauß](https://unsplash.com/@martzzl) | [photo page](https://unsplash.com/photos/the-tail-light-of-a-car-in-the-dark-Hm1F6EBNA70) |  |
| `taillights-rear-portrait.jpg` | 1067×1600 | a car's rear in the dark, both tail lights on, portrait | [Marcel Strauß](https://unsplash.com/@martzzl) | [photo page](https://unsplash.com/photos/a-couple-of-red-lights-that-are-on-the-side-of-a-car-8iJ2kbX2j9c) | plate softened |
| `tbilisi-panorama-night.jpg` | 1600×1067 | Tbilisi at night: the Mtkvari, the Peace Bridge | [Viktor SOLOMONIK](https://unsplash.com/@solomonikvik) | [photo page](https://unsplash.com/photos/a-view-of-a-city-at-night-from-a-high-point-of-view-3lIn100zAV4) | Unsplash tags it Tbilisi |
| `tbilisi-street-night.jpg` | 1600×899 | a Tbilisi street at night from above, traffic | [Abhinav Singh](https://unsplash.com/@airabhi) | [photo page](https://unsplash.com/photos/a-city-street-filled-with-lots-of-traffic-at-night--l1uLaX0qnw) | Unsplash tags it Tbilisi |
| `traffic-light-trails-portrait.jpg` | 1067×1600 | a city avenue at night, light trails, portrait | [Mohammad Mardani](https://unsplash.com/@mmdam20) | [photo page](https://unsplash.com/photos/a-busy-street-at-night-LSlv0OC8e2k) |  |
| `tyre-worn.jpg` | 1600×1200 | a worn-through tyre, cords showing | [engin akyurt](https://unsplash.com/@enginakyurt) | [photo page](https://unsplash.com/photos/detailed-rubber-tire-surface-showing-wear-marks-CNFac-rBTag) |  |
| `volga-parked-portrait.jpg` | 1280×1600 | an old Volga sedan parked, door open, from above, portrait | [Egor Litvinov](https://unsplash.com/@litvinov) | [photo page](https://unsplash.com/photos/a-white-car-parked-in-a-parking-lot-next-to-a-tree-hzYRuN26ftg) | plate and the driver behind the windshield softened |
| `windshield-note-portrait.jpg` | 1067×1600 | a paper note under the wiper of a red car, portrait | [Eugenia Pan'kiv](https://unsplash.com/@eugenivy_now) | [photo page](https://unsplash.com/photos/red-car-with-ticket-on-windshield-THIQJTvXqnQ) |  |
| `windshield-ticket.jpg` | 1600×1067 | a yellow parking ticket under a wiper | [Carl Tronders](https://unsplash.com/@allvar) | [photo page](https://unsplash.com/photos/yellow-parking-ticket-on-car-windshield-J6nFYB9K888) |  |
| `yard-salvage-aerial.jpg` | 1600×900 | a salvage auction yard from above, hundreds of cars | [Daniel Miksha](https://unsplash.com/@danielmiksha) | [photo page](https://unsplash.com/photos/aerial-view-of-a-large-car-junkyard-with-many-vehicles-Fzgt4yFtgVA) |  |
| `yard-wrecks-aerial.jpg` | 1600×900 | wrecked cars in a yard from above | [Daniel Miksha](https://unsplash.com/@danielmiksha) | [photo page](https://unsplash.com/photos/aerial-view-of-a-junkyard-filled-with-many-cars-arMJkQaY1Fk) |  |

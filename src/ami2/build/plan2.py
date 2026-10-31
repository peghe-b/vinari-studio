#!/usr/bin/env python3
"""„კიდევ ამინთო" v2 (31 Oct 2026, the owner rejected v1: "few shots, nothing refined, nobody understands it; make it like the
viral promos, many refined shots"): the same verified sound as v1 (public/vo/amintho/mix.wav, its subtitles and its beats), the
picture rebuilt on the viral diagnostics promo's world (src/diagpromo: the warm night garage, the 3D crossover, the cockpit, the
white explainer), a new picture every 1-2 s and no set twice. This writes src/ami2/timeline.json:
  shots   the 30 shots (id, from, to); the ids that the diagpromo shots read keep their names
  events  v1's beats plus the beats the reused shots read (their names), placed on v1's sound
  subs    v1's subtitles unchanged
    python3 src/ami2/build/plan2.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'amintho', 'timeline.json')
OUT = os.path.join(HERE, '..', 'timeline.json')

v1 = json.load(open(SRC))
E = dict(v1['events'])

# the picture: (id, from); each shot runs to the next one's start
SHOTS = [
    ('pop', 0.0),        # the cockpit at night, the amber lamp pops on (chime)
    ('yell', 0.81),      # the driver out on the night road, close: „კიდევ ამინთო?!"
    ('road', 1.98),      # wide: the man in the middle of the road by the crossover, arms up: „ამის ცოლშვილი მო—" (bleep at the cut)
    ('aerial', 3.275),   # SUDDEN: straight above and far, the dark road, the car, the tiny man, his shout echoing, birds
    ('bay', 5.78),       # mechanic 1 deep in the engine bay: „დაჩიკია, ძმაო."
    ('bill', 7.05),      # the terminal: 80 ₾ paid
    ('morning', 8.78),   # the start button the next morning, the amber back
    ('retort', 9.56),    # mechanic 2 (older) at his bench: „სანთლებია."
    ('coils', 11.1),     # the coils from above under the work lamp: „ას ოცი ლარი."
    ('again', 13.53),    # through the windscreen: the lamp again
    ('lounge', 14.31),   # mechanic 3 on the phone at his tool chest: „კატალიზატორია..."
    ('seat', 16.0),      # the call on speaker, face up on the passenger seat: „ცხრაასი ლარი."
    ('drain', 18.35),    # lari notes slipping into a street drain: „ათას ასი ლარი..."
    ('lamp', 20.2),      # „და მაინც ანთია." the one lamp, still on
    ('wires', 22.01),    # NARRATOR: „ჩეკი ინთება?" a dozen parts, one lamp
    ('roulette', 23.55), # „ჯერ მანქანას ჰკითხე, მერე ხელოსანს." the guess that never agrees
    ('reveal', 25.6),    # the phone rises out of the dark into the white
    ('port', 27.21),     # „პატარა ადაპტერი საჭის ქვეშ" the port under the wheel, the lens
    ('plug', 28.45),     # „ერთდება." the adapter in, its LED
    ('app', 30.04),      # „Vinari ნახევარ წუთში" the scanner, the tap
    ('found', 31.0),     # „წაიკითხავს" the scan runs
    ('code', 32.9),      # „და ქართულად გეტყვის:" P0457
    ('morph', 34.2),     # „ავზის თავსახური მოშვებულია." the English line turns Georgian
    ('puzzle', 36.17),   # the driver: „თავსახური?"
    ('cap', 37.78),      # the fuel door, the cap turned home: three clicks
    ('verdict', 39.83),  # „კოდს Vinari-ში წაშლი," the real result on the dash
    ('off', 41.35),      # „და ჩეკი ქრება." the amber goes out
    ('laugh', 42.98),    # „ამის ცოლშვილი... კარგი, Vinari. კარგი." he laughs
    ('out', 45.3),       # from above, the crossover glides down a sunny road
    ('end', 46.9),       # the end card: the stores, the free week as an option, the comment ask
]
TOTAL = v1['total']

shots = []
for i, (sid, t0) in enumerate(SHOTS):
    t1 = SHOTS[i + 1][1] if i + 1 < len(SHOTS) else TOTAL
    shots.append({'id': sid, 'from': round(t0, 3), 'to': round(t1, 3)})

# the beats the reused diagpromo shots read, placed on v1's sound
E.update({
    'pop': E['lampOn'],
    'm0': 5.95, 'm1': E['part1'],
    'total': E['price1'], 'cardTap': 7.85, 'paid': 8.15,
    'press': 8.84, 'checkBack': E['again1'],
    'r1': E['part2'],
    'm3': 11.3,
    'isev': E['again2'],
    'c7': E['part3'],
    'lampOn': 20.45,
    'wires': 22.15,
    'spin': 23.75,
    'rise': 25.65, 'wake': 26.0, 'whiteout': 26.25, 'kick': 26.45,
    'lens': 27.4, 'portGlow': 27.75,
    'adapterIn': 28.5, 'led': 29.2,
    'scanTap': 30.3,
    'radar': 31.05, 'wifi': 31.3, 'found': 31.6, 'scanRun': 31.9, 'note': 32.3,
    'codeIn': 33.0,
    'scramble': 34.3, 'misfire': 34.5, 'word': 34.9,
    'verdict': 40.0,
    'yellFrom': 0.81,
})
E['lampOnV1'] = v1['events']['lampOn']

tl = {'total': TOTAL, 'fps': v1.get('fps', 30), 'shots': shots, 'events': E, 'subs': v1['subs'], 'music': {}}
json.dump(tl, open(OUT, 'w'), ensure_ascii=False, indent=1)
print(f'{len(shots)} shots, {TOTAL:.2f} s -> {OUT}')
for s in shots:
    print(f"  {s['id']:9s} {s['from']:6.2f} {s['to'] - s['from']:5.2f}")

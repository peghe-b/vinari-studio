#!/usr/bin/env python3
"""The four-navigators hook's voices (4 Nov 2026, ChatGPT's idea 01 „ოთხი შტურმანი, ერთი საჭე“): one Gemini take per line,
cached in public/vo/navhook/<id>.wav (gitignored like every studio voice). The navigator's own line is the app's real clip
(Vinari/Resources/NavVoice/nv-male-turn.right.600m.m4a), never generated here.
    python3 src/navhook/build/voices.py           voice what is not cached (one request a line)
"""
import os, sys, wave
import numpy as np
VS = '/Users/admin/Documents/Claude Projects/Vinari/video-studio'
sys.path.insert(0, os.path.join(VS, 'tools'))
import vo  # noqa

OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'vo', 'navhook')
MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']
TAIL = ' ცოცხალი, ბუნებრივი სასაუბრო თბილისური ქართული, მანქანაში, ღამით. არასდროს როგორც მსახიობი, დიქტორი ან რეკლამა.'
LINES = [
    ('mom', 'gemini:Gacrux', 'მარჯვნივ მოუხვიე, შვილო!',
     'ორმოცდაათი წლის თბილისელი დედა, წინა სავარძელში ზის და ყვირის: ძალიან ხმამაღლა, სწრაფად, მკაცრად და ბრძანებით, '
     'შეშფოთებული, თითქოს მოსახვევი ახლავე გაიქცევა. არავითარ შემთხვევაში თბილად, ნაზად ან მშვიდად. '
     '„შვილო“ ბოლოს მკვეთრად, ბრძანებასავით.'),
    ('gio', 'gemini:Puck', 'არა, პირდაპირ, ტო!',
     'ოცდაშვიდი წლის ბიჭი, უკანა სავარძლიდან წინ გადმოიხარა. თავხედი, ხალისიანი, დარწმუნებული, დედას ეწინააღმდეგება. '
     'სწრაფად, ხმამაღლა, „ტო“ ქუჩურად.'),
    ('luka', 'gemini:Algenib', 'ხიდზე გადადი, ხიდზე!',
     'ოცდაათი წლის კაცი, დაბალი მამაკაცის ხმით, უკანა ფანჯარასთან, ხიდს თითით აჩვენებს და ყვირის: ძალიან ხმამაღლა, '
     'აჩქარებული და აღელვებული, თითქოს ხიდს ახლავე გამოტოვებენ. მეორე „ხიდზე“ კიდევ უფრო მაღლა, მოთმინებადაკარგული. '
     'არავითარ შემთხვევაში მშვიდად.'),
    ('drv', 'gemini:Orus', 'ხმების უმრავლესობით ვუხვევთ?!',
     'ოცდათხუთმეტი წლის მძღოლი საჭესთან, სამი ადამიანი ერთდროულად ეუბნება, სად მოუხვიოს, და მოთმინება ეწურება. '
     'გაოცებული, გაღიზიანებული და ირონიული კითხვა, ხმამაღლა, თითქოს ვერ იჯერებს. „ვუხვევთ“ მკაფიოდ, „ვ“-თი.'),
    ('drv2', 'gemini:Orus', 'ეს მანქანაა თუ პარლამენტი?!',
     'იგივე ოცდათხუთმეტი წლის მძღოლი, ახლა მოთმინება სულ დაკარგა და ყვირის: ძალიან ხმამაღლა, სასოწარკვეთილად და '
     'სასაცილოდ, ორივე ხელი თავზე აქვს. „პარლამენტი“ ყველაზე ხმამაღლა. არავითარ შემთხვევაში მშვიდად ან ირონიით.'),
    ('mom2', 'gemini:Gacrux', 'ხომ გითხარი!',
     'იგივე ორმოცდაათი წლის დედა: ნავიგატორმა მისი სიტყვა გაიმეორა და ახლა ტრიუმფით, კმაყოფილი ღიმილით, '
     'ოდნავ ჩუმად და ეშმაკურად ამბობს.'),
]
ONLY = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
os.makedirs(OUT, exist_ok=True)
for lid, voice, text, style in LINES:
    if ONLY and lid not in ONLY:
        continue
    p = os.path.join(OUT, f'{lid}.wav')
    if os.path.exists(p):
        print(lid, 'cached'); continue
    for m in MODELS:
        try:
            pcm = np.asarray(vo.gemini_request(text, voice, m, style + TAIL), dtype=np.int16)
            break
        except (vo.GeminiQuota, vo.GeminiUnavailable) as e:
            print(lid, m, 'skip:', type(e).__name__, flush=True)
    else:
        raise SystemExit(f'{lid}: no model gave a take')
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(vo.SR); w.writeframes(pcm.tobytes())
    print(lid, m, f'{len(pcm) / vo.SR:.2f}s', flush=True)

#!/usr/bin/env python3
"""The navigator promo's voices, all into public/vo/navpromo/ (gitignored):

  clips/<id>.wav    the app's REAL navigator clips (Nelson = nv-male-*, Alice = nv-female-*), decoded, priming gone
  gps/gps-N.wav     the foreign GPS (edge-tts en-GB-SoniaNeural, free), dry; the phone-speaker colour is the mixer's
  gemini/*.wav      ONE Gemini take for the narrator and ONE for the lost man (cached by text+voice+model+note)
  voices.json       every file's measured speech on/off and length

    python3 src/navpromo/build/voices.py            clips + GPS (free), and the Gemini takes only if cached
    python3 src/navpromo/build/voices.py --gemini   also asks Gemini for a take that is not cached (one request each)

The Gemini key is read by tools/vo.py (env or ~/.config/vinari/gemini.key) and never printed.
"""
import asyncio
import hashlib
import os
import sys

import numpy as np

from common import NAVVOICE, OUT, SR, STUDIO, fade, load, read_wav, save_json, speech_span, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))
# a newer edge-tts than tools/pylib (403 there on 2026-10-12), installed outside the repo; tools/pylib is left alone
if os.environ.get("NAVPROMO_PYLIB"):
    sys.path.insert(0, os.environ["NAVPROMO_PYLIB"])

MODEL = "gemini-3.8-flash-tts"

CLIPS = {
    "alice-offline": "nv-female-status.offline",
    "nelson-intro": "nv-male-m-intro",
    "alice-intro": "nv-female-f-intro",
    "nelson-300m": "nv-male-turn.right.300m",
    "nelson-street": "nv-male-street.sample",
    "alice-roundabout": "nv-female-roundabout.exit2.now",
    "alice-lane": "nv-female-lane.right",
    "nelson-camera": "nv-male-h_camera_06",
    "nelson-now": "nv-male-turn.right.now",
    "nelson-arrived": "nv-male-status.arrived.right",
}

GPS = {
    "gps-1": "In three hundred meters, turn right.",
    "gps-2": "Turn left.",
    "gps-3": "Recalculating.",
    "gps-4": "You have arrived.",
}
GPS_VOICE = "en-GB-SoniaNeural"
GPS_RATE = "+8%"

# One take per voice: every line of that voice in one request, cut later only at its sentence ends.
NARRATOR = {
    "voice": "gemini:Algieba",
    "text": (
        "აი, ზუსტად ამიტომ შევქმენით ვინარი. "
        "საქართველოში პირველად! "
        "ნავიგატორი, რომელიც ქართულად გელაპარაკება. "
        "რუკა, ძებნა და ხმა ტელეფონშივეა. "
        "აბა, მოუსმინე. "
        "გრუნტის გზას აგარიდებს. "
        "ხუმრობა არ გინდა? გამორთე. "
        "მოსაწყენო. "
        "მალე ქარფლეიზეც ნახავ, სიტყვას გაძლევთ. "
        "აწი აღარ დაიკარგები. "
        "ეს მხოლოდ დასაწყისია. "
        "ვინარი ჩაიწერე, გამოგვყევი და მომავლისთვის მზად იყავი."
    ),
    # 2026-10-12: the SteelSeries reference, heard: a dry, deadpan young man, close to the microphone, never hype; fluent in
    # the explaining lines, slow and isolated on the punchlines, a real breath after the reveal and after the slam, one
    # whispered aside (მოსაწყენო) right after the dry „გამორთე.“
    "style": (
        "ბოხი, ღრმა, ხმამაღალი, მამაკაცური ხმა, როგორც დიდი რეკლამის მთხრობელი, მიკროფონთან ახლოს. დინჯად, დაჯერებულად და "
        "ამაყად ლაპარაკობს, მშრალი იუმორით; ძლიერი და მკაფიოა, მაგრამ არასდროს ჟღერს როგორც იაფი რეკლამა. "
        "„აი, ზუსტად ამიტომ შევქმენით ვინარი.“ ნელა და დაბლა თქვი, ყოველ სიტყვას წონა აქვს, მერე ღრმად ჩაისუნთქე. "
        "„საქართველოში პირველად!“ ნელა, ამაყად და მტკიცედ, ოდნავ უფრო ხმამაღლა, მაგრამ ყვირილის გარეშე; მერე სრული პაუზა და "
        "ერთი ჩასუნთქვა. შემდეგი წინადადებები ბუნებრივად, ცოცხლად და თავისუფლად, საუბრის ტემპით, როგორც მეგობარს უხსნი. "
        "„აბა, მოუსმინე.“ უფრო ჩუმად, თითქოს რაღაცას ჩაგირთავს. „ხუმრობა არ გინდა? გამორთე.“ მშრალად და უემოციოდ. "
        "„მოსაწყენო.“ ჩურჩულით თქვი, ძალიან ჩუმად, თითქოს თავისთვის, ცალკე. „სიტყვას გაძლევთ“ ნელა და მტკიცედ. "
        "„აწი აღარ დაიკარგები.“ და „ეს მხოლოდ დასაწყისია.“ დინჯად, ცალ-ცალკე. ბოლო წინადადება თბილად და ამაყად, დაბლა დაასრულე. "
        "ყოველი წინადადების მერე ბუნებრივი სუნთქვა. ყველა სიტყვა ქართული გამოთქმით: ვინარი (ვი-ნა-რი), ქარფლეი (ქარ-ფლეი)."
    ),
}
MAN = {
    "voice": "gemini:Fenrir",
    "text": (
        "რაით? "
        "ლეფთ? ლეფთი სადაა? "
        "დევიკარგე, შენ დედას შევეცი! "
        "ვერ გევიგე, ენა არ მესმის! "
        "დევიკარგე, დედა ჩემო!"
    ),
    "style": (
        "ღამით ტყეში დაკარგული შუახნის კაცი, იმერული კილოთი; პანიკაშია და კომიკურად გაბრაზებული, ტელეფონს უყვირის, "
        "მოკლე, აჩქარებული ფრაზებით, ცოტა გადაჭარბებით, სასაცილოდ. ყოველი ფრაზის მერე პატარა პაუზა. „რაით?“ და "
        "„ლეფთ?“ ინგლისური სიტყვების დამახინჯებული გამეორებაა, გაკვირვებით."
    ),
}


def clips():
    meta = {}
    for key, name in CLIPS.items():
        src = os.path.join(NAVVOICE, name + ".m4a")
        a = load(src)
        on, off = speech_span(a, -42)
        dst = os.path.join(OUT, "clips", key + ".wav")
        write_wav(dst, a)
        meta[key] = {"src": name, "len": round(len(a) / SR, 3), "on": round(on, 3), "off": round(off, 3)}
        print(f"clip {key:18s} {len(a) / SR:5.2f}s  speech {on:4.2f}-{off:4.2f}")
    return meta


async def gps():
    import edge_tts

    meta = {}
    for key, text in GPS.items():
        mp3 = os.path.join(OUT, "gps", key + ".mp3")
        for attempt in range(8):  # the free endpoint answers 403 now and then: wait and ask again
            if os.path.exists(mp3) and os.path.getsize(mp3) > 0:
                break
            try:
                await edge_tts.Communicate(text, GPS_VOICE, rate=GPS_RATE).save(mp3)
            except Exception as e:  # noqa: BLE001
                print(f"edge-tts {key}: {type(e).__name__}, retry {attempt + 1}")
                if os.path.exists(mp3):
                    os.remove(mp3)
                await asyncio.sleep(4 + 3 * attempt)
        a = load(mp3)
        on, off = speech_span(a, -42)
        a = fade(a[int(max(0, on - 0.02) * SR): int(min(len(a) / SR, off + 0.06) * SR)])
        dst = os.path.join(OUT, "gps", key + ".wav")
        write_wav(dst, a)
        meta[key] = {"text": text, "len": round(len(a) / SR, 3)}
        print(f"gps  {key}  {len(a) / SR:5.2f}s  {text}")
    return meta


def take_path(spec):
    k = hashlib.sha1(f"{MODEL}|{spec['voice']}|{spec['style']}|{spec['text']}".encode()).hexdigest()[:16]
    return os.path.join(OUT, "gemini", f"{spec['voice'].split(':')[1].lower()}-{k}.wav")


def take(spec, ask):
    path = take_path(spec)
    if not os.path.exists(path):
        if not ask:
            print(f"gemini: {spec['voice']} not cached (run with --gemini)")
            return None
        import vo

        pcm = vo.gemini_request(spec["text"], spec["voice"], MODEL, spec["style"])
        a = np.asarray(pcm, dtype=np.float32) / 32768.0
        tmp = path + ".24k.wav"
        write_wav(tmp, a, sr=vo.SR)
        a = read_wav(tmp)  # -> 48 kHz
        os.remove(tmp)
        write_wav(path, a)
        print(f"gemini: {spec['voice']} voiced ({len(a) / SR:.2f}s), one request")
    a = read_wav(path)
    return {"file": os.path.relpath(path, OUT), "len": round(len(a) / SR, 3), "voice": spec["voice"], "model": MODEL}


def main():
    ask = "--gemini" in sys.argv
    meta = {"clips": clips(), "gps": asyncio.run(gps())}
    meta["narrator"] = take(NARRATOR, ask)
    meta["man"] = take(MAN, ask)
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()


# The whispered aside, voiced apart on purpose (the main take said it only a little quieter, 2026-10-12): same voice, same
# model, one request, cached like the takes.
WHISPER = {
    "voice": "gemini:Algieba",
    "text": "მოსაწყენო.",
    "style": (
        "ჩურჩულით თქვი, ხმის ჩართვის გარეშე, მხოლოდ სუნთქვით, ძალიან ახლოს მიკროფონთან, თითქოს მეგობარს ყურში ეუბნება, "
        "მშრალი ირონიით და ღიმილით. ბოხი, ღრმა მამაკაცური ხმა. ქართული გამოთქმით."
    ),
}

if __name__ == "__main__" and "--whisper" in sys.argv:
    meta = load_json_safe = None
    w = take(WHISPER, True)
    print(w)


# The hook (the owner, 2026-10-12: "at the start a Georgian voice that grabs attention: he shouts, loud, 'where am I?! where
# am I here?!'"): the lost man's own voice (Fenrir), a take of its own so the main take's cut points stay as they are.
SHOUT = {
    "voice": "gemini:Fenrir",
    "text": "სად ვარ?! სად ვარ აქანა?!",
    "style": (
        "ღამით ტყეში დაკარგული შუახნის კაცი, იმერული სოფლური კილოთი. მთელი ხმით, ძალიან ხმამაღლა ყვირის, პანიკაში, "
        "თითქოს ტყეში ვინმეს ეძახის; პირველი ფრაზა მოკლე ყვირილია, მეორე კიდევ უფრო ძლიერად და გაწელილად, სასოწარკვეთით "
        "და ცოტა სასაცილოდ. „აქანა“ კუთხურად, „აქ“-ის ნაცვლად."
    ),
}

if __name__ == "__main__" and "--shout" in sys.argv:
    print(take(SHOUT, True))

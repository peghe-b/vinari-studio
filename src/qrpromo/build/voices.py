#!/usr/bin/env python3
"""The QR promo's two voices, into public/vo/qrpromo/gemini/ (gitignored, like every voice of the studio):

  WOMAN     ONE Gemini take of the young woman's four lines (act 1 and the calm line at the end)
  NARRATOR  ONE Gemini take of the narrator (Algieba, the navigator promo's big-ad voice)

    python3 src/qrpromo/build/voices.py            report what is cached
    python3 src/qrpromo/build/voices.py --gemini   ask Gemini for a take that is not cached (one request each)

The swear is NEVER sent to the voice: the woman's line stops at „მომი..." and the film's bleep covers the rest (plan.py).
The Gemini key is read by tools/vo.py (env or ~/.config/vinari/gemini.key) and never printed.
"""
import hashlib
import os
import sys

import numpy as np

from common import OUT, SR, STUDIO, read_wav, save_json, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))

MODEL = os.environ.get("QR_TTS_MODEL", "gemini-3.8-flash-tts")

WOMAN = {
    "voice": "gemini:Leda",
    "text": (
        "ისევ უცნობი ნომერი... "
        "აუუუ, რა ტვინი მომი... "
        "ნომერი საქარე მინაზე რამ დამაწერინა? "
        "აი, ახლა კი მშვიდად."
    ),
    "style": (
        "ახალგაზრდა თბილისელი გოგო, ოცდაათამდე, საღამოს სარკესთან ემზადება. ცოცხალი, ბუნებრივი, თანამედროვე ქალაქური "
        "ქართული, მიკროფონთან ახლოს, თითქოს თავისთვის ლაპარაკობს. ოდნავ კომიკური და ძალიან ცოცხალი, არასდროს როგორც დიქტორი. "
        "„ისევ უცნობი ნომერი...“ დაღლილად და გაღიზიანებულად, ამოოხვრით, ხმას დაბლა უშვებს, თითქოს ეს მეათედ ხდება. "
        "„აუუუ,“ გრძლად და ხმამაღლა გაწელე, თავი უკან გადააგდო, სასოწარკვეთილი და სასაცილო ბღავილით; მერე სწრაფად და "
        "გაბრაზებით „რა ტვინი მომი...“ და ბოლო სიტყვა მკვეთრად, შუაში გაწყვიტე, თითქოს ვიღაცამ პირზე ხელი აიფარა; "
        "ბოლო სიტყვას არ ასრულებ. მერე პაუზა. "
        "„ნომერი საქარე მინაზე რამ დამაწერინა?“ თავის თავზე გაბრაზებით და ცოტა სასაცილო თვითირონიით, ნამდვილი კითხვის "
        "ინტონაციით, უფრო ჩუმად. მერე გრძელი პაუზა. "
        "„აი, ახლა კი მშვიდად.“ სულ სხვანაირად: მშვიდად, თბილად, ღიმილით, მსუბუქი ამოსუნთქვით, თითქოს ბოლოს და ბოლოს "
        "დაისვენა. ყველა სიტყვა ქართული გამოთქმით."
    ),
}

NARRATOR = {
    "voice": "gemini:Algieba",
    "text": (
        "საქართველოში პირველად: "
        "ვინარის ქიუარ ბარათი. "
        "ნომერი აღარ გჭირდება. "
        "ბარათზე მხოლოდ კოდია. "
        "ვისაც რამე უნდა, დაასკანერებს. "
        "აპიც არ სჭირდება. "
        "მიზეზს აირჩევს და ერთი დაჭერით გაგზავნის. "
        "შენ შეტყობინება მოგივა. "
        "შენი ნომრის გარეშე. "
        "ნომერი შენთან რჩება."
    ),
    # the navigator promo's narrator (v99, the owner liked it): loud, deep, proud, a big ad's voice, never cheap
    "style": (
        "ბოხი, ღრმა, ხმამაღალი, მამაკაცური ხმა, როგორც დიდი რეკლამის მთხრობელი, მიკროფონთან ახლოს. დინჯად, დაჯერებულად და "
        "ამაყად ლაპარაკობს; ძლიერი და მკაფიოა, მაგრამ არასდროს ჟღერს როგორც იაფი რეკლამა. "
        "„საქართველოში პირველად:“ ნელა, ამაყად და მტკიცედ, ყოველ სიტყვას წონა აქვს; მერე მოკლე პაუზა. "
        "„ვინარის ქიუარ ბარათი.“ ამაყად და თბილად, როგორც ახალი ნივთის წარდგენა; მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "შემდეგი წინადადებები ბუნებრივად, ცოცხლად და დამაჯერებლად, საუბრის ტემპით, როგორც მეგობარს უხსნი, ყოველი "
        "წინადადების მერე ბუნებრივი სუნთქვა. „აპიც არ სჭირდება.“ მშრალად, ოდნავ ღიმილით. "
        "„შენი ნომრის გარეშე.“ ნელა და მტკიცედ. „ნომერი შენთან რჩება.“ ბოლოს, თბილად და ამაყად, დაბლა დაასრულე. "
        "ყველა სიტყვა ქართული გამოთქმით: ვინარი (ვი-ნა-რი), ქიუარ (ქი-უ-არ, ორი ასო)."
    ),
}


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
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    meta = {}
    for name, spec in (("woman", WOMAN), ("narrator", NARRATOR)):
        if only and name not in only:
            p = take_path(spec)
            meta[name] = take(spec, False) if os.path.exists(p) else None
            continue
        meta[name] = take(spec, ask)
        print(name, meta[name])
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()

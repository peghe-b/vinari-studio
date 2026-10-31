#!/usr/bin/env python3
"""The „კიდევ ამინთო" promo's voices (2026-10-31, the check lamp that keeps coming back), into public/vo/amintho/gemini/
(gitignored). One Gemini take per character, each its own request:

  MAN     the driver (Fenrir): his five lines in one take, a full pause between them; plan.py cuts at the pauses
  M1..M3  the three mechanics, one line each, three different men
  NARR    ONE continuous take of the narrator's whole part (Algieba, the house voice)

    python3 src/amintho/build/voices.py            report what is cached
    python3 src/amintho/build/voices.py --gemini   ask Gemini for every take that is not cached (one request each)
    python3 src/amintho/build/voices.py --gemini man   only that one

The swear is NEVER sent to the voice: the driver's second line ends on a harmless stand-in word („მოგიკითხოთ"); plan.py
keeps its first syllable „მო" and lays the bleep over the rest, the subtitle shows „მო#@%". The key is read by tools/vo.py
and never printed.
"""
import hashlib
import os
import sys

import numpy as np

from common import OUT, SR, STUDIO, read_wav, save_json, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))

MODEL = os.environ.get("AMI_TTS_MODEL", "gemini-3.8-flash-tts")

MAN_LINES = [
    "კიდევ ამინთო?!",
    "ამის ცოლშვილი მოგიკითხოთ!",
    "ათას ასი ლარი... და მაინც ანთია.",
    "თავსახური?",
    "ამის ცოლშვილი... კარგი, ვინარი. კარგი.",
]
MAN = {
    "voice": "gemini:Fenrir",
    "text": " ".join(MAN_LINES),
    "style": (
        "ორმოცი წლის თბილისელი მძღოლი, ჩვეულებრივი კაცი, ცოცხალი ქუჩის ქართულით, არასდროს მსახიობი ან დიქტორი. "
        "ხუთი ცალკე ფრაზა: ყოველი ფრაზის მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„კიდევ ამინთო?!“ ცარიელ გზაზე მდგარი ყვირის, გაბრაზებული და დაღლილი, მთელი ხმით. "
        "„ამის ცოლშვილი მოგიკითხოთ!“ კიდევ უფრო ხმამაღლა, ცაში ყვირის, მთელი ბრაზით, „ცოლშვილი“ ხაზგასმით. "
        "„ათას ასი ლარი... და მაინც ანთია.“ ჩუმად, გატეხილი, ბორდიურზე ჩამომჯდარი, ამოიოხრებს, ნელა. "
        "„თავსახური?“ ჩუმად, დაბნეული, არ სჯერა. "
        "„ამის ცოლშვილი... კარგი, ვინარი. კარგი.“ ჯერ ძველებურად იწყებს, მერე ჩერდება და ეცინება, ბოლოს თბილად, ღიმილით. "
        "ყველა სიტყვა სუფთა ქართული გამოთქმით."
    ),
}

M1 = {
    "voice": "gemini:Achird",
    "text": "დაჩიკია, ძმაო. ოთხმოცი ლარი.",
    "style": (
        "ოცდაათი წლის თბილისელი ხელოსანი, თავდაჯერებული, საღეჭი რეზინით პირში, თითქოს უკვე ყველაფერი იცის. "
        "მოკლედ და მხიარულად, ქუჩის ბუნებრივი ქართულით, არასდროს დიქტორი. „ოთხმოცი ლარი“ ისე, თითქოს წვრილმანია."
    ),
}
M2 = {
    "voice": "gemini:Charon",
    "text": "სანთლებია. ას ოცი ლარი.",
    "style": (
        "სამოცი წლის გამოცდილი ხელოსანი, დინჯი, ბრძენივით, ნელა ლაპარაკობს, ცოტა ჩახლეჩილი ხმით. "
        "„სანთლებია“ ისე, თითქოს ამაზე ეჭვი არ არსებობს. ბუნებრივი ქართული, არასდროს დიქტორი."
    ),
}
M3 = {
    "voice": "gemini:Orus",
    "text": "კატალიზატორია... ცხრაასი ლარი.",
    "style": (
        "ორმოცდაათი წლის ხელოსანი, ჯერ კბილებს ამოიწუწნის და თავს გააქნევს, როგორც ცუდი ამბის მთქმელი, "
        "„კატალიზატორია“ ნელა და მძიმედ, პაუზის მერე „ცხრაასი ლარი“ მშვიდად, თითქოს ჩვეულებრივი ფასია. "
        "ბუნებრივი ქუჩის ქართული, არასდროს დიქტორი."
    ),
}

NARR_LINES = [
    "ჩეკი ინთება? ჯერ მანქანას ჰკითხე, მერე ხელოსანს.",
    "პატარა ადაპტერი საჭის ქვეშ ერთდება.",
    "ვინარი ნახევარ წუთში წაიკითხავს და ქართულად გეტყვის:",
    "ავზის თავსახური მოშვებულია.",
    "თავსახურს ბოლომდე მოუჭერ, კოდს ვინარიში წაშლი, და ჩეკი ქრება.",
    "ვინარი ეპ სთორსა და გუგლ ფლეიზეა.",
    "შეგიძლია ერთი კვირა უფასოდაც სცადო.",
    "დაწერე კომენტარებში „ვინარი“ და გადმოსაწერ ლინკს გამოგიგზავნით.",
]
NARR = {
    "voice": "gemini:Algieba",
    "text": " ".join(NARR_LINES),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი, დაბალი მამაკაცის ხმა, რომელიც მეგობარს რაღაც ძალიან სასარგებლოს "
        "უყვება, ცოტა ეშმაკური ღიმილით, თავდაჯერებულად და მშვიდად, როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. "
        "ტემპი არ ჩქარობს, წინადადებები ერთმანეთში რბილად გადადის, ყოველი წინადადების ბოლოს მშვიდი სუნთქვა. "
        "„ჩეკი ინთება?“ ნამდვილი კითხვაა, „ჯერ მანქანას ჰკითხე, მერე ხელოსანს“ თავდაჯერებით, ღიმილით. "
        "„ავზის თავსახური მოშვებულია“ ნელა, თითქოს ეკრანიდან კითხულობს, მცირე იუმორით. "
        "„და ჩეკი ქრება“ კმაყოფილი ღიმილით. „შეგიძლია ერთი კვირა უფასოდაც სცადო“ თბილად, როგორც მეგობრული შეთავაზება. "
        "ბოლო წინადადება მეგობრულად, „ვინარი“ მკაფიოდ, დაბლა დაასრულე. "
        "არავითარ შემთხვევაში: აჩქარება, მონოტონური კითხვა, ზღაპრის ტონი, თეატრალური პათოსი. "
        "ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ეპ სთორი, გუგლ ფლეი."
    ),
}

TAKES = {"man": MAN, "m1": M1, "m2": M2, "m3": M3, "narr": NARR}


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

        os.makedirs(os.path.dirname(path), exist_ok=True)
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
    vj = os.path.join(OUT, "voices.json")
    meta = {}
    if os.path.exists(vj):
        import json

        meta = json.load(open(vj))
    for name, spec in TAKES.items():
        meta[name] = take(spec, ask and (not only or name in only))
        print(name, meta[name])
    save_json(vj, meta)


if __name__ == "__main__":
    main()

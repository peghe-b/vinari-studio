#!/usr/bin/env python3
"""The diagnostics promo's three voices, into public/vo/diagpromo/gemini/ (gitignored, like every voice of the studio):

  NARR      ONE Gemini take of the whole narrator part (Algieba, the QR promo's NARR5 storyteller note)
  MECHANIC  ONE take of the mechanic's three lines (a gruff older man: the garage, the phone call, the callback)
  OWNER     ONE take of the young car owner's two lines (the bleeped morning, the callback with the phone)

    python3 src/diagpromo/build/voices.py            report what is cached
    python3 src/diagpromo/build/voices.py --gemini   ask Gemini for a take that is not cached (one request each)

The swear is NEVER sent to the voice: the owner's line stops at „გამი..." and the film's bleep covers the rest (plan.py).
The Gemini key is read by tools/vo.py (env or ~/.config/vinari/gemini.key) and never printed.
"""
import hashlib
import os
import sys

import numpy as np

from common import OUT, SR, STUDIO, read_wav, save_json, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))

MODEL = os.environ.get("DIAG_TTS_MODEL", "gemini-3.8-flash-tts")

# the QR promo's NARR5 note (the owner liked it, 2026-10-14: slow, warm, a grown-up storyteller, never a fairytale), every
# sentence closed by a calm breath so plan.py finds its borders; the pronunciations of this film's words added
NARR = {
    "voice": "gemini:Algieba",
    "text": (
        "საქართველოში პირველად: მანქანის დიაგნოსტიკა და ო-ბი-დი სკანერი, ქართულად. "
        "მანქანა ყოველთვის გეუბნება, რა სჭირს. უბრალოდ, აქამდე არავინ გითარგმნიდა. "
        "საჭის ქვეშ პატარა ბუდეა, ო-ბი-დი. "
        "იაფ ადაპტერს ჩადებ და ვინარი მანქანას დაელაპარაკება. "
        "ერთი სკანი და ქართულად გეტყვის: რა სჭირს, რამდენად სერიოზულია და შეგიძლია თუ არა იარო. "
        "მანქანის ყიდვამდეც შეამოწმებ, რომ ჩეკი არავინ დაგიმალოს. "
        "ადაპტერი არ გაქვს? მანქანის ხმა ჩაწერე. "
        "გეტყვის, რამდენად სასწრაფოა, რა შეიძლება იყოს და ხელოსანს ზუსტად რა უთხრა. "
        "მანქანაში თუ არ ერკვევი, აღარც დაგჭირდება. "
        "და ეს მხოლოდ დასაწყისია: ვინარი ყოველ განახლებაზე ახალს მატებს. "
        "ვინარი ჩაიწერე, ეპ სთორსა და გუგლ ფლეიზეა. "
        "შენი მანქანა ქართულად ალაპარაკდა."
    ),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი მამაკაცის ხმა, რომელიც ამბავს მშვიდად და გულით ყვება, "
        "როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. ტემპი ნელი და ჰარმონიულია: არ ჩქარობს, ყოველ აზრს "
        "დრო აძლევს, რომ მსმენელს ჩაესმას. ემოცია ცოცხალია: თანაგრძნობა პრობლემაზე, სიამაყე და სითბო, როცა "
        "გამოსავალს ამბობს, ბოლოს ოდნავ ეშმაკური ღიმილი. ყოველი წინადადების ბოლოს მშვიდი, მკაფიო სუნთქვა და პაუზა, "
        "წინადადება ერთმანეთში რბილად გადადის. „საქართველოში პირველად“ ნათქვამია დინჯად, სიამაყით და ოდნავი პაუზით, "
        "მერე თბილად და მკაფიოდ „მანქანის დიაგნოსტიკა და ო-ბი-დი სკანერი, ქართულად“. „ადაპტერი არ გაქვს?“ ნამდვილი "
        "კითხვის ინტონაციით. „და ეს მხოლოდ დასაწყისია“ ოდნავ ჩუმად და იდუმალად, წინ მზერით. ბოლო წინადადება "
        "„შენი მანქანა ქართულად ალაპარაკდა.“ თბილად, ამაყად და ნელა, დაბლა დაასრულე. "
        "არავითარ შემთხვევაში: აჩქარება, მიფუჩეჩება, მონოტონური კითხვა, ზღაპრის ან ბავშვური ტონი, მღერადი "
        "ინტონაცია, თეატრალური პათოსი. ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ო-ბი-დი (სამი ასო, "
        "ინგლისურად), ეპ სთორი, გუგლ ფლეი."
    ),
}

# the mechanic: one take, three lines (plan.py cuts it at its breaths: the garage, the phone, the callback)
MECHANIC = {
    "voice": "gemini:Algenib",
    "text": (
        "აბა... სანთლებიც შესაცვლელია, კოჭაც, ესეც... "
        "ძმაო, აბა ახლა გადაცემათა კოლოფიც ვნახოთ... "
        "ჰო. კი, ბატონო."
    ),
    "style": (
        "ორმოცდაათ წელს გადაცილებული თბილისელი ხელოსანი, ავტოსახელოსნოდან. ბოხი, ჩახრინწული, დაბალი ხმა, "
        "ზანტად და თავდაჯერებულად ლაპარაკობს, ცოტა ეშმაკურად, თითქოს ყველაფერი იცის, სინამდვილეში კი ხვდება. "
        "ცოცხალი, ბუნებრივი ქუჩური თბილისური ქართული, არასდროს როგორც მსახიობი ან დიქტორი. "
        "„აბა...“ გრძლად, ფიქრიანად, თითქოს ძრავში იყურება; მერე პაუზა. „სანთლებიც შესაცვლელია, კოჭაც, ესეც...“ "
        "დინჯად, ჩამონათვალივით, ყოველი ნაწილის მერე მცირე პაუზა, ბოლო „ესეც...“ ზანტად, ხელის ჩაქნევით. "
        "მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„ძმაო, აბა ახლა გადაცემათა კოლოფიც ვნახოთ...“ ტელეფონში, თბილად და მშვიდად, თითქოს ეს ყველაფერი "
        "ჩვეულებრივი ამბავია და კიდევ ფულს ითვლის. მერე გრძელი პაუზა და ერთი ჩასუნთქვა. "
        "„ჰო. კი, ბატონო.“ სულ სხვანაირად: ჩუმად, დაბნეულად, ცოტა შერცხვენილად, „ჰო.“ მოკლედ და დაბლა, "
        "პაუზა, მერე „კი, ბატონო.“ თითქმის ჩურჩულით, დამორჩილებით. ყველა სიტყვა სუფთა ქართული გამოთქმით."
    ),
}

# the owner: one take, two lines; „გამი..." breaks off (the bleep covers the rest of the word), then the line goes on
OWNER = {
    "voice": "gemini:Fenrir",
    "text": (
        "ხუთასი ლარი გამი... და ჩეკი ისევ ანთია! "
        "ნახე: პე-ნული-სამასი, ცილინდრი ტოვებს. ჯერ სანთლები შეამოწმე."
    ),
    "style": (
        "ახალგაზრდა თბილისელი ბიჭი, ოცდახუთი-ოცდაათი წლის, მანქანის პატრონი. ცოცხალი, ბუნებრივი, თანამედროვე "
        "ქალაქური ქართული, მიკროფონთან ახლოს, არასდროს როგორც მსახიობი ან დიქტორი. "
        "„ხუთასი ლარი გამი...“ გაბრაზებით და სასოწარკვეთით, ხმამაღლა, საჭეზე ხელის დარტყმით; ბოლო სიტყვა მკვეთრად, "
        "შუაში გაწყვიტე, თითქოს ვიღაცამ პირზე ხელი აიფარა, ბოლო სიტყვას არ ასრულებ; მცირე პაუზა; მერე სწრაფად და "
        "ბრაზით „და ჩეკი ისევ ანთია!“, ბოლოს ხმა უტყდება, სასაცილოდ. მერე გრძელი პაუზა და ერთი ჩასუნთქვა. "
        "„ნახე:“ სულ სხვანაირად: მშვიდად, თავდაჯერებულად, ოდნავ ამაყი ღიმილით, ტელეფონს აჩვენებს. "
        "„პე-ნული-სამასი,“ მკაფიოდ, კოდივით; „ცილინდრი ტოვებს.“ თითქოს ეს ყველამ იცის. მოკლე პაუზა. "
        "„ჯერ სანთლები შეამოწმე.“ მშვიდად, ოდნავ ეშმაკურად, თითქოს ახლა ის არის ოსტატი. "
        "ყველა სიტყვა სუფთა ქართული გამოთქმით."
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
    for name, spec in (("narr", NARR), ("mechanic", MECHANIC), ("owner", OWNER)):
        if only and name not in only:
            p = take_path(spec)
            meta[name] = take(spec, False) if os.path.exists(p) else None
            continue
        meta[name] = take(spec, ask)
        print(name, meta[name])
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()

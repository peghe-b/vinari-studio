#!/usr/bin/env python3
"""The navigator + CarPlay promo's voices, into public/vo/navpromo3/ (gitignored, like every voice of the studio):

  NAV_EN   ONE Gemini take of the foreign phone GPS (English, stiff, it mangles „ჭავჭავაძე"): its three lines
  HER      ONE Gemini take of the woman (Leda, the QR promo's woman's voice): playful and annoyed, never shrill; her six lines
  NARR     ONE Gemini take of the whole narrator part (Algieba, the QR promo v5's note: slow, warm, a grown-up storyteller)
  SCREAM   v1.3 (the owner, 2026-10-21: "at the very start I want her to curse, aggressively, screaming"): ONE Leda take of her
           furious opening line; its insult is bleeped in the mix (plan.py), the subtitle masks it („ბ#@%ო")
  NARR_END v1.3 (the owner: the ending forgot the offer and „ულიმიტოდ"): ONE Algieba take of the new last line, the same
           storyteller's note; it replaces NARR's last two sentences (islands 20 and 21 are no longer used)
  clips/   the app's REAL navigator clips (Nelson = nv-male-*, Alice = nv-female-*), decoded, never re-voiced

    python3 src/navpromo3/build/voices.py            the clips (free) and report what is cached
    python3 src/navpromo3/build/voices.py --gemini   also ask Gemini for a take that is not cached (one request each)

The Gemini key is read by tools/vo.py (env or ~/.config/vinari/gemini.key) and never printed.
"""
import hashlib
import os
import sys

import numpy as np

from common import NAVVOICE, OUT, SR, STUDIO, load, read_wav, save_json, speech_span, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))

MODEL = os.environ.get("NAV3_TTS_MODEL", "gemini-3.8-flash-tts")

# the real clips: their text is the app's (phrases.ka.json), the subtitle shows exactly that
CLIPS = {
    # „ექვსას მეტრში მარჯვნივ მოუხვიე." the drive screen (17-nav-drive) says 600 მ, მარჯვნივ მოუხვიე: the voice says the
    # number the screen shows (the brief's 300 m clip would contradict the real screen under it)
    "nelson-600": ("nv-male-turn.right.600m", "ექვსას მეტრში მარჯვნივ მოუხვიე."),
    # „ახლა მარცხენა მხარე დაიკავე და დატრიალდი." the turnaround family's real clip (the brief's line without „ახლა" has no clip)
    "alice-turnaround": ("nv-female-turnaround.left.now", "ახლა მარცხენა მხარე დაიკავე და დატრიალდი."),
    "alice-right-now": ("nv-female-turn.right.now", "ახლა მარჯვნივ მოუხვიე."),
    "alice-arrived": ("nv-female-status.arrived", "მოვედით."),
    # v1.2 (the art director: prove the features with the app's own voice): the roundabout, the speed camera, and in the car a
    # line that matches the real CarPlay capture under it (f18-12: 290 m, მარჯვენა მხარე დაიჭირე)
    "nelson-round": ("nv-male-roundabout.exit2.now", "წრეზე მეორე გასასვლელით გადი."),
    "nelson-camera": ("nv-male-alert.camera.300m", "სამას მეტრში სიჩქარის კამერაა."),
    "alice-keep-right": ("nv-female-keep.right.300m", "სამას მეტრში მარჯვნივ დაიჭირე."),
}

NAV_EN = {
    "voice": "gemini:Kore",
    "text": (
        "In five hundred feet, turn left onto Tchav... Tchavtchavadze Avenue. "
        "Recalculating. "
        "Make a U-turn when possible."
    ),
    "style": (
        "A stiff, flat, robotic in-car GPS voice from a cheap foreign phone app: an American woman reading prompts, monotone, "
        "precise, a little synthetic and emotionless, clear studio sound, never warm, never funny on purpose. "
        "In the first line she stumbles on the Georgian street name: say 'Tchav...' and stop for a beat as if the software "
        "got stuck, then mispronounce it the American way, slowly and badly: 'Chav-chav-AD-zee Avenue'. "
        "Then a full pause. 'Recalculating.' flat and mechanical. Then a full pause. 'Make a U-turn when possible.' flat, "
        "polite and robotic, as if nothing had happened."
    ),
}

HER = {
    "voice": "gemini:Leda",
    "text": (
        "ფუტი?! ფუტი რამდენი მეტრია?! "
        "აუ, ისევ გამოვტოვე. "
        "სად დავტრიალდე, აქ?! "
        "ამდენი წვალება ერთი ვახშმისთვის... "
        "აი, ასე."
    ),
    "style": (
        "ახალგაზრდა, ლამაზი და თავდაჯერებული თბილისელი ქალი, ოცდაათამდე, საღამოს ვახშამზე მიდის და მანქანას თვითონ "
        "მართავს. ცოცხალი, ბუნებრივი, თანამედროვე ქალაქური ქართული, მიკროფონთან ახლოს, თბილი, ოდნავ დაბალი, ხავერდოვანი "
        "ხმით; მომხიბვლელი და ოდნავ კოკეტური, ბრაზიც კი ლამაზად და სასაცილოდ გამოსდის. არასდროს წივილი, ყვირილი ან "
        "მაღალი ხმა, არასდროს როგორც დიქტორი. "
        "„ფუტი?!“ გაკვირვებით და გაღიზიანებით, მოკლედ. „ფუტი რამდენი მეტრია?!“ სწრაფად და ირონიულად, ნამდვილი "
        "კითხვის ინტონაციით, თითქოს ტელეფონს ეკითხება. მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„აუ, ისევ გამოვტოვე.“ ამოოხვრით, თავის თავზე გაბრაზებით, „აუ“ ოდნავ გაწელილი. მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„სად დავტრიალდე, აქ?!“ დაბლა, მანქანის იატაკისკენ, აღშფოთებით და სასაცილოდ, „აქ?!“ ხაზგასმით. მერე სრული პაუზა "
        "და ერთი ჩასუნთქვა. "
        "„ამდენი წვალება ერთი ვახშმისთვის...“ დაღლილად და ჩუმად, ნაღვლიანი ღიმილით, თმაზე ხელს ისვამს, ბოლოს მსუბუქად "
        "ამოიოხრებს. მერე გრძელი პაუზა. "
        "„აი, ასე.“ სულ სხვანაირად: მშვიდად, კმაყოფილად, თბილი და ოდნავ ეშმაკური ღიმილით, ნელა, თითქოს მანქანიდან "
        "გადმოდის. ყველა სიტყვა სუფთა ქართული გამოთქმით."
    ),
}

NARR = {
    "voice": "gemini:Algieba",
    "text": (
        "ამ წვალებას ერთი რამე ჯობია: ნავიგატორი, რომელიც ქართულად გელაპარაკება. "
        "ვინარში ნელსონი ან ალისა გზას ქართულად გეტყვიან, მეტრებით. "
        "წრეზე გასასვლელს დაგითვლის, ზოლს მიგითითებს და დატრიალებასაც გარკვევით გეტყვის. "
        "კამერას, ბორცვს და რკინიგზის გადასასვლელს წინასწარ გეტყვის. "
        "ინტერნეტიც არ სჭირდება: რუკაც და ხმაც ტელეფონშია. "
        "და რასაც ითხოვდით, უკვე აქაა: ვინარი ქარფლეიზეცაა. "
        "აიფონი მანქანას შეაერთე, კაბელით ან უსადენოდ, და ეკრანზე ვინარის ხატულას დააჭირე. "
        "„სად“-ში აირჩიე, საით მიდიხარ, და „წავედით“. "
        "ტელეფონს ხელი აღარ სჭირდება: რუკა მანქანის ეკრანზეა, ხმა კი მანქანის დინამიკებში. "
        "პირველი მგზავრობა საჩუქარია. "
        "ვინარი ეპ სთორსა და გუგლ ფლეიზეა."
    ),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი მამაკაცის ხმა, რომელიც ამბავს მშვიდად და გულით ყვება, "
        "როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. ტემპი ნელი და ჰარმონიულია: არ ჩქარობს, ყოველ აზრს "
        "დრო აძლევს, რომ მსმენელს ჩაესმას. ემოცია ცოცხალია: თანაგრძნობა წვალებაზე, სიამაყე და სითბო, როცა "
        "გამოსავალს ამბობს, ბოლოს ოდნავ ეშმაკური ღიმილი. ყოველი წინადადების ბოლოს მშვიდი, მკაფიო სუნთქვა და პაუზა, "
        "წინადადება ერთმანეთში რბილად გადადის. პირველი წინადადება „ამ წვალებას ერთი რამე ჯობია:“ დინჯად, ოდნავი "
        "ღიმილით და პაუზით, მერე თბილად და მკაფიოდ „ნავიგატორი, რომელიც ქართულად გელაპარაკება“. "
        "„და რასაც ითხოვდით, უკვე აქაა:“ სითბოთი და სიამაყით, როგორც კარგი ამბავი, რომელსაც ხალხი ელოდა, მერე "
        "„ვინარი ქარფლეიზეცაა“ ამაყად და მკაფიოდ. შეერთების ნაწილი („აიფონი მანქანას შეაერთე...“, „„სად“-ში აირჩიე...“) "
        "ნათქვამია ნელა და გასაგებად, როგორც კარგი მასწავლებელი, ნაბიჯ-ნაბიჯ; „სად“ და „წავედით“ ეკრანის ღილაკების "
        "სახელებია, ოდნავ ხაზგასმით. ბოლო წინადადება თბილად და ნელა, დაბლა დაასრულე. "
        "არავითარ შემთხვევაში: აჩქარება, მიფუჩეჩება, მონოტონური კითხვა, ზღაპრის ან ბავშვური ტონი, მღერადი "
        "ინტონაცია, თეატრალური პათოსი. ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ნელსონი, ალისა, ქარფლეი "
        "(ქარ-ფლეი), აიფონი, ეპ სთორი, გუგლ ფლეი."
    ),
}


# v1.3: the opening scream. „ბოზო" is a mild folk insult (the owner's street-word list) aimed at the phone, never a person; the
# film bleeps it anyway (a clean 1 kHz tone over the whole word, the QR promo's bleep) and the subtitle shows „შე ბ#@%ო"
SCREAM = {
    "voice": "gemini:Leda",
    "text": "რა ფუტი, შე ბოზო?! მეტრებით ილაპარაკე!",
    "style": (
        "იგივე ახალგაზრდა თბილისელი ქალი, ღამით მანქანას მართავს, მაგრამ ახლა მოთმინება ამოეწურა: ტელეფონს უყვირის, "
        "მთელი ხმით, გაცოფებული, აგრესიულად და უხეშად, ნამდვილი, ნედლი ბრაზით. ეს ყვირილია, არა ლაპარაკი: ხმამაღალი, "
        "დაძაბული ყელით, ხმა ბრაზისგან ოდნავ ებზარება, მაგრამ ყველა სიტყვა მკაფიოა. არა მულტფილმური, არა თეატრალური, არა "
        "კოკეტური, არა სასაცილო: ნამდვილი ადამიანის ნამდვილი გაბრაზება მანქანაში. "
        "„რა ფუტი, შე ბოზო?!“ ერთი ამოსუნთქვით, სწრაფად და ძლიერად, „ბოზო“ ყველაზე მაგრად. ერთი მოკლე, გაბრაზებული "
        "ჩასუნთქვა. „მეტრებით ილაპარაკე!“ კიდევ უფრო ხმამაღლა, ბრძანებით, მარცვალ-მარცვალ ჩაკაკუნებით, „ილაპარაკე!“ "
        "ბოლომდე ყვირილით. ყველა სიტყვა სუფთა ქართული გამოთქმით. "
        "(Delivery: SCREAMING at the phone, furious, aggressive, raw and genuinely angry, loud, never cartoonish.)"
    ),
}

NARR_END = {
    "voice": "gemini:Algieba",
    "text": (
        "ჩამოტვირთე ვინარი და ერთი კვირა უფასოდ სცადე: იარე ულიმიტოდ, ქართულად, გაუჩერებლად. "
        "ვინარი ეპ სთორსა და გუგლ ფლეიზეა."
    ),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი მამაკაცის ხმა, რომელიც ამბავს მშვიდად და გულით ყვება, "
        "როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. ეს რგოლის ბოლო სიტყვებია. ტემპი ნელი და ჰარმონიულია: არ ჩქარობს, "
        "ყოველ აზრს დრო აძლევს, რომ მსმენელს ჩაესმას. „ჩამოტვირთე ვინარი“ თბილად და მოსაწვევად, „და ერთი კვირა უფასოდ "
        "სცადე:“ მკაფიოდ და ღიმილით, „ერთი კვირა უფასოდ“ ოდნავ ხაზგასმით, მერე მშვიდი პაუზა. „იარე ულიმიტოდ, ქართულად, "
        "გაუჩერებლად.“ სამ დინჯ ნაბიჯად, ყოველი სიტყვის შემდეგ პატარა პაუზით, სიამაყით და თავისუფლების გრძნობით. მერე "
        "მშვიდი სუნთქვა და პაუზა. „ვინარი ეპ სთორსა და გუგლ ფლეიზეა.“ თბილად და ნელა, ოდნავ ეშმაკური ღიმილით, დაბლა "
        "დაასრულე. არავითარ შემთხვევაში: აჩქარება, მიფუჩეჩება, მონოტონური კითხვა, ზღაპრის ან ბავშვური ტონი, მღერადი "
        "ინტონაცია, თეატრალური პათოსი, რეკლამის ყვირილი. ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ულიმიტოდ, "
        "გაუჩერებლად, ეპ სთორი, გუგლ ფლეი."
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


def clips():
    meta = {}
    for key, (name, text) in CLIPS.items():
        a = load(os.path.join(NAVVOICE, name + ".m4a"))
        on, off = speech_span(a, -42)
        dst = os.path.join(OUT, "clips", key + ".wav")
        write_wav(dst, a)
        meta[key] = {"src": name, "text": text, "file": os.path.relpath(dst, OUT), "len": round(len(a) / SR, 3), "on": round(on, 3), "off": round(off, 3)}
        print(f"clip {key:18s} {len(a) / SR:5.2f}s  speech {on:4.2f}-{off:4.2f}  {text}")
    return meta


def main():
    ask = "--gemini" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    meta = {"clips": clips()}
    for name, spec in (("nav", NAV_EN), ("her", HER), ("narr", NARR), ("scream", SCREAM), ("narr_end", NARR_END)):
        if only and name not in only:
            meta[name] = take(spec, False)
            continue
        meta[name] = take(spec, ask)
        print(name, meta[name])
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()

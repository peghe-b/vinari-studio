#!/usr/bin/env python3
"""The QR promo's two voices, into public/vo/qrpromo/gemini/ (gitignored, like every voice of the studio):

  WOMAN     ONE Gemini take of the young woman's four lines (act 1 and the calm line at the end)
  NARRATOR  ONE Gemini take of the narrator (Algieba, the navigator promo's big-ad voice)
  NARRATOR2 ONE more Algieba take for v3's new lines (the three buttons, the stores, the closing line)

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


# v3 (the owner, 2026-10-14): the two new narrator lines in ONE more Algieba take, the narrator's own director note (its
# voice paragraph word for word, the notes per line for the new lines): the three buttons the passer-by sees (the real
# labels of public/screens/15-qr-web.jpg) after „აპიც არ სჭირდება.", the store line over the App Store page, and the new
# closing line (the old „ნომერი შენთან რჩება." with a cheeky turn). The first take is kept for every other line.
NARRATOR2 = {
    "voice": "gemini:Algieba",
    "text": (
        "სამ ღილაკს დაინახავს: "
        "მანქანა გზას მიკეტავს, "
        "შუქები ანთია, "
        "მანქანასთან რაღაც ხდება. "
        "ვინარი ჩაიწერე, ეპ სთორსა და გუგლ ფლეიზეა. "
        "ნომერიც შენთან რჩება და ნერვებიც."
    ),
    "style": (
        "ბოხი, ღრმა, ხმამაღალი, მამაკაცური ხმა, როგორც დიდი რეკლამის მთხრობელი, მიკროფონთან ახლოს. დინჯად, დაჯერებულად და "
        "ამაყად ლაპარაკობს; ძლიერი და მკაფიოა, მაგრამ არასდროს ჟღერს როგორც იაფი რეკლამა. "
        "„სამ ღილაკს დაინახავს:“ ბუნებრივად, ცოცხლად და დამაჯერებლად, საუბრის ტემპით, როგორც მეგობარს უხსნი; მერე მოკლე "
        "პაუზა. სამი ღილაკის სახელი ცალ-ცალკე, მშვიდად და მკაფიოდ, როგორც ჩამონათვალი, თითოეულის მერე მოკლე პაუზა: "
        "„მანქანა გზას მიკეტავს,“ „შუქები ანთია,“ „მანქანასთან რაღაც ხდება.“ მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„ვინარი ჩაიწერე,“ თბილად და დაჯერებულად, „ეპ სთორსა და გუგლ ფლეიზეა.“ მკაფიოდ; მერე სრული პაუზა და ერთი ჩასუნთქვა. "
        "„ნომერიც შენთან რჩება და ნერვებიც.“ ბოლოს, თბილად და ამაყად, ოდნავ ღიმილით, „და ნერვებიც“ ცოტა ნელა, დაბლა "
        "დაასრულე. ყველა სიტყვა ქართული გამოთქმით: ვინარი (ვი-ნა-რი), ეპ სთორი (ეპ-სთო-რი), გუგლ ფლეი (გუგლ-ფლეი)."
    ),
}


# v4 (the owner, 2026-10-14: „საქართველოში პირველად: ვინარის ქიუარ ბარათი" sounded dumb and childish, "like telling a
# children's fairytale"): the WHOLE narrator part in ONE continuous Algieba take, one Gemini request, a grown-up premium
# ad read whose sentences flow into each other. It replaces both earlier narrator takes (they stay cached, unused).
NARR4 = {
    "voice": "gemini:Algieba",
    "text": (
        "საქართველოში პირველად: ვინარის ქიუარ ბარათი. "
        "ნომერი აღარ გჭირდება, ბარათზე მხოლოდ კოდია. "
        "ვისაც რამე უნდა, დაასკანერებს. აპიც არ სჭირდება. "
        "სამ ღილაკს დაინახავს: მანქანა გზას მიკეტავს, შუქები ანთია, მანქანასთან რაღაც ხდება. "
        "მიზეზს აირჩევს და ერთი დაჭერით გაგზავნის. "
        "შენ შეტყობინება მოგივა, შენი ნომრის გარეშე. "
        "ვინარი ჩაიწერე, ეპ სთორსა და გუგლ ფლეიზეა. "
        "ნომერიც შენთან რჩება და ნერვებიც."
    ),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი მამაკაცის ხმა, რომელიც ამბავს მშვიდად და გულით ყვება, "
        "როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. ტემპი ნელი და ჰარმონიულია: არ ჩქარობს, ყოველ აზრს "
        "დრო აძლევს, რომ მსმენელს ჩაესმას. ემოცია ცოცხალია: თანაგრძნობა პრობლემაზე, სიამაყე და სითბო, როცა "
        "გამოსავალს ამბობს, ბოლოს ოდნავ ეშმაკური ღიმილი. აზრებს შორის ბუნებრივი, მშვიდი სუნთქვა, წინადადება "
        "ერთმანეთში რბილად გადადის. „საქართველოში პირველად“ ნათქვამია დინჯად, სიამაყით და ოდნავი პაუზით, "
        "მერე თბილად „ვინარის ქიუარ ბარათი“. სამი ღილაკის სახელი მშვიდად, თითოეული ცალკე ჩანს. "
        "არავითარ შემთხვევაში: აჩქარება, მიფუჩეჩება, მონოტონური კითხვა, ზღაპრის ან ბავშვური ტონი, მღერადი "
        "ინტონაცია, თეატრალური პათოსი. ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ქიუარ (ორი ასო), ეპ სთორი, გუგლ ფლეი."
    ),
}


# v5 (the owner, 2026-10-14: the explanation was thin; say how and where the card is made and its big pluses: no number,
# no plate, no spam, quiet at night, off at any time): the WHOLE narrator part again in ONE Algieba take, NARR4's slow,
# warm storyteller note, every sentence closed by a calm breath so plan.py finds its borders.
NARR5 = {
    "voice": "gemini:Algieba",
    "text": (
        "საქართველოში პირველად: ვინარის ქიუარ ბარათი. "
        "აპში შექმნი, ა-ოთხზე ამობეჭდავ და საქარე მინის მიღმა დადებ. "
        "ბარათზე არც შენი ნომერია, არც მანქანის ნომერი. მხოლოდ კოდი. "
        "ვისაც რამე უნდა, დაასკანერებს. აპიც არ სჭირდება. "
        "სამ ღილაკს დაინახავს: მანქანა გზას მიკეტავს, შუქები ანთია, მანქანასთან რაღაც ხდება. "
        "მიზეზს აირჩევს და ერთი დაჭერით გაგზავნის. "
        "შენ შეტყობინება მოგივა. ზარი არა. შენს ნომერს ვერავინ გაიგებს. "
        "სპამი არ იქნება: ერთი ბარათიდან ხშირად ვერავინ მოგწერს. "
        "ღამით, თუ გინდა, უხმოდ მოვა. ბარათს კი ნებისმიერ დროს გათიშავ. "
        "ვინარი ჩაიწერე, ეპ სთორსა და გუგლ ფლეიზეა. "
        "ნომერიც შენთან რჩება და ნერვებიც."
    ),
    "style": NARR4["style"].replace(
        "აზრებს შორის ბუნებრივი, მშვიდი სუნთქვა,",
        "ყოველი წინადადების ბოლოს მშვიდი, მკაფიო სუნთქვა და პაუზა,",
    ).replace("ქიუარ (ორი ასო),", "ქიუარ (ორი ასო), ა-ოთხი (ქაღალდის ზომა),"),
}


# v4 (the owner, 2026-10-14: "at the start add voices, as if a guy talks on the phone in an aggressive street tone,
# „მანქანა ხელს მიშლის, ტოოო", and „შენი გაცნობა, ლამაზო?"; heard FROM her phone, so people get it at once): two male
# callers, each ONE Gemini request in a voice that is not the narrator's. plan.py puts them through a phone speaker.
CALLER1 = {
    "voice": "gemini:Fenrir",
    "text": "მანქანა ხელს მიშლის, ტოოოოო!",
    "style": (
        "ახალგაზრდა თბილისელი ბიჭი, ოცი-ოცდახუთი წლის, ქუჩური, უხეში, გაბრაზებული და ხმამაღალი, ტელეფონში ყვირის, "
        "მოუთმენლად, თითქოს უცნობ მანქანას ეჯახება და ახლავე უნდა წავიდეს. ლაპარაკობს სწრაფად, მკვეთრად, ქუჩის ბიჭის "
        "კილოთი, არასდროს როგორც მსახიობი ან დიქტორი. „მანქანა ხელს მიშლის,“ სწრაფად და უხეშად, ერთ სუნთქვაზე; მერე "
        "„ტოოოოო!“ ძალიან გრძლად გაწელე, თითქმის ერთი წამი, ხმამაღლა და ბრაზით, ბოლოსკენ ხმა დაბლა ჩამოდის, როგორც "
        "ქუჩაში ყვირიან „ტოო“. ყველა სიტყვა სუფთა ქართული გამოთქმით."
    ),
}
CALLER2 = {
    "voice": "gemini:Enceladus",
    "text": "შენი გაცნობა, ლამაზო?",
    "style": (
        "ახალგაზრდა კაცი, თავმოწონებული და ტლანქი, ყალბად ტკბილი ხმით, ტელეფონში უცნობ გოგოს უხეიროდ ეარშიყება და "
        "ჰგონია, რომ ძალიან მომხიბვლელია. ლაპარაკობს ნელა, ზანტად, ხმადაბლა, მიკროფონთან ახლოს, ცალყბა ღიმილით. "
        "„შენი გაცნობა,“ ნელა და გაწელილად, თითქოს თავს აწონებს; მერე „ლამაზო?“ კიდევ უფრო ნელა, ტკბილად და "
        "თავხედურად, კითხვის ინტონაციით, ბოლო ხმოვანი ოდნავ გაწელე. არასდროს როგორც მსახიობი ან დიქტორი. "
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
    for name, spec in (("woman", WOMAN), ("narrator", NARRATOR), ("narrator2", NARRATOR2), ("narr4", NARR4), ("narr5", NARR5), ("caller1", CALLER1), ("caller2", CALLER2)):
        if only and name not in only:
            p = take_path(spec)
            meta[name] = take(spec, False) if os.path.exists(p) else None
            continue
        meta[name] = take(spec, ask)
        print(name, meta[name])
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()

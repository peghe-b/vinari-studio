#!/usr/bin/env python3
"""The OBD promo's voices (2026-10-30, the used-car story „ქალს ჰყავდა"), into public/vo/obdpromo/gemini/ (gitignored):

  NARR    ONE Gemini take of the whole narrator part (Algieba, the viral diagnostics promo's storyteller note)
  SELLER  ONE take of the used-car seller's four short lines (a different male voice); plan.py cuts it at its breaths

    python3 src/obdpromo/build/voices.py            report what is cached
    python3 src/obdpromo/build/voices.py --gemini   ask Gemini for a take that is not cached (one request each)

The swear is NEVER sent to the voice: the seller's third line carries a mild stand-in word („საყვარელო") which plan.py cuts
out whole and covers with the bleep; the subtitle shows „#@%". The key is read by tools/vo.py and never printed.
"""
import hashlib
import os
import sys

import numpy as np

from common import OUT, SR, STUDIO, read_wav, save_json, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.join(STUDIO, "tools", "pylib"))

MODEL = os.environ.get("OBD_TTS_MODEL", "gemini-3.8-flash-tts")

# the narrator: every sentence in order, one take; the seller's lines fall between its pieces in plan.py
NARR_LINES = [
    "ამ ქალს ყველა გამყიდველი იცნობს.",
    "ჩეკი მართლა არ ანთია. წუხელ ჩააქრო.",
    "ჩეკის ჩაქრობას რამდენიმე წამი უნდა. ხარვეზი კი ადგილზე რჩება.",
    "შენ კი ჯიბიდან პატარა ადაპტერს იღებ და საჭის ქვეშ, მუხლის სიმაღლეზე, ბუდეში აერთებ.",
    "ვინარიში ყიდვამდე შემოწმებას ხსნი.",
    "მანქანა თავის თავს გამუდმებით ამოწმებს. კოდებს თუ წაშლი, ეს შემოწმებები თავიდან იწყება.",
    "ვინარი ამას ჩვეულებრივ ნახევარ წუთში კითხულობს და გეუბნება: კოდები ახლახან წაშლილი ჩანს.",
    "და პატიოსნად დასძენს: შეიძლება უბრალოდ აკუმულატორი შეცვალეს, გამყიდველს ჰკითხე.",
    "შენ კი მშვიდად ეუბნები: ერთ კვირაში ისევ მოვალ.",
    "ერთი კვირა მანქანა ისევ დადის, ხარვეზი კი თავისას შვრება.",
    "ისევ ამოწმებ. ახლა ყველაფერი ჩანს.",
    "ჩეკი ანთია, და ჩეკით უკვე ორას ორმოცი კილომეტრია გავლილი.",
    "სამსახურში, ალბათ.",
    "ვინარი კოდებს ქართულად გიხსნის: კატალიზატორის ეფექტიანობა დაბალია, ნარევი ღარიბია.",
    "ტექინსპექტირების მზადყოფნა: რვა შემოწმებიდან შვიდი დასრულდა.",
    "ფული ჯიბეში გრჩება. და თუ მაინც გინდა, ხელოსანთან უკვე იცი, რა აჩვენო.",
    "ვინარი პლუსით ულიმიტოდ შეამოწმებ, რამდენი მანქანაც გინდა.",
    "ვინარი ეპ სთორსა და გუგლ ფლეიზეა.",
    "შეგიძლია ერთი კვირა უფასოდაც სცადო.",
    "დაწერე კომენტარებში „ვინარი“ და გადმოსაწერ ლინკს გამოგიგზავნით.",
]
NARR = {
    "voice": "gemini:Algieba",
    "text": " ".join(NARR_LINES),
    "style": (
        "ერთი უწყვეტი ჩანაწერი. ზრდასრული, თბილი მამაკაცის ხმა, რომელიც ამბავს მშვიდად და გულით ყვება, "
        "როგორც კარგი მთხრობელი დიდ სარეკლამო რგოლში. ტემპი ნელი და ჰარმონიულია: არ ჩქარობს, ყოველ აზრს "
        "დრო აძლევს, რომ მსმენელს ჩაესმას. ემოცია ცოცხალია: ოდნავ ეშმაკური ღიმილი გამყიდველის ამბავზე, "
        "სიმშვიდე და თავდაჯერება, როცა მყიდველი ამოწმებს. ყოველი წინადადების ბოლოს მშვიდი, მკაფიო სუნთქვა და პაუზა, "
        "წინადადება ერთმანეთში რბილად გადადის. „ამ ქალს ყველა გამყიდველი იცნობს“ ირონიულად, ღიმილით. "
        "„კოდები ახლახან წაშლილი ჩანს“ ნელა, ხაზგასმით. „სამსახურში, ალბათ“ მშრალი იუმორით, ჩუმად, პაუზის მერე. "
        "„შეგიძლია ერთი კვირა უფასოდაც სცადო“ თბილად და მშვიდად, როგორც მეგობრული შეთავაზება. ბოლო წინადადება "
        "„დაწერე კომენტარებში ვინარი და გადმოსაწერ ლინკს გამოგიგზავნით“ მეგობრულად, „ვინარი“ მკაფიოდ, დაბლა დაასრულე. "
        "არავითარ შემთხვევაში: აჩქარება, მიფუჩეჩება, მონოტონური კითხვა, ზღაპრის ან ბავშვური ტონი, მღერადი "
        "ინტონაცია, თეატრალური პათოსი. ყველა სიტყვა სუფთა ქართული გამოთქმით: ვინარი, ვინარი პლუსი, ეპ სთორი, გუგლ ფლეი."
    ),
}

# the seller: one take, four short lines, a full pause and a breath between them
SELLER_LINES = [
    "ქალს ჰყავდა. მარტო სამსახურში დადიოდა.",
    "ნახე, ჩეკიც არ ანთია!",
    "რას ეძებ მანდ, შე საყვარელო? სუფთა მანქანაა!",
    "აკუმულატორი? ჰო, აკუმულატორი შევცვალე!",
]
SELLER = {
    "voice": "gemini:Puck",
    "text": " ".join(SELLER_LINES),
    "style": (
        "ორმოც წელს გადაცილებული თბილისელი მეორადი მანქანების გამყიდველი. ტკბილად მოლაპარაკე, ეშმაკი, "
        "თავდაჯერებული, ცოტა ზედმეტად მეგობრული, თითქოს ძალიან კარგ საქმეს გთავაზობს. ცოცხალი, ბუნებრივი ქუჩური "
        "თბილისური ქართული, არასდროს როგორც მსახიობი ან დიქტორი. ოთხი ცალკე ფრაზა: ყოველი ფრაზის მერე სრული "
        "პაუზა და ერთი ჩასუნთქვა. „ქალს ჰყავდა. მარტო სამსახურში დადიოდა.“ ნაცნობი ფრაზასავით, ტკბილად, კაპოტზე "
        "ხელის დარტყმით. „ნახე, ჩეკიც არ ანთია!“ ამაყად, გამარჯვებულივით. „რას ეძებ მანდ, შე საყვარელო? სუფთა "
        "მანქანაა!“ ხელოვნურად ნაწყენი, ცოტა ხმამაღლა, „შე საყვარელო“ ერთ ამოსუნთქვაზე, ხაზგასმით. "
        "„აკუმულატორი? ჰო, აკუმულატორი შევცვალე!“ ჯერ ერთი წამით დაბნეული, მერე სწრაფად და ზედმეტი ენთუზიაზმით, "
        "თითქოს ახლა გაახსენდა. ყველა სიტყვა სუფთა ქართული გამოთქმით."
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
    for name, spec in (("narr", NARR), ("seller", SELLER)):
        if only and name not in only:
            p = take_path(spec)
            meta[name] = take(spec, False) if os.path.exists(p) else None
            continue
        meta[name] = take(spec, ask)
        print(name, meta[name])
    save_json(os.path.join(OUT, "voices.json"), meta)


if __name__ == "__main__":
    main()

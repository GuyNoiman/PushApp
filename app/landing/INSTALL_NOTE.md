# The install note, to send to a tester

Kept here because it is needed again for every new tester, and because the awkward steps have to be
written down rather than improvised each time. Somebody who meets them without having been told
expects they mean the file is unsafe.

There are TWO of them, and the second is the one that actually stops people. Android's "unknown
source" warning is the famous one. **Google Play Protect** is the one that ends the attempt: its
prominent button cancels, and the way through is an unstyled line of text hidden behind "More
details". A tester followed this note to the letter on 2026-08-31, downloaded the file, met that
dialog, and ended up back in his Downloads folder with the app not installed.

Both versions say the same thing. The page they point at picks the right platform on its own.

---

## עברית

היי, האפליקציה עוד לא בחנות, אז ההתקנה ישירה. זה לוקח שלוש דקות, ואנדרואיד יבקש ממך לאשר משהו באמצע — זה נורמלי לאפליקציה שלא הגיעה מהחנות.

1. **מהטלפון עצמו**, לא מהמחשב, פותחים את הקישור: **https://pushapp-invite.expo.app**
2. לוחצים על **התקנה לאנדרואיד**. נפתח דף ההתקנה והקובץ יורד.
3. אנדרואיד יגיד שהוא לא נוהג לאפשר התקנה מהמקור הזה, ויציע כפתור **הגדרות**. מאשרים לדפדפן שממנו הורדת, חוזרים, ומאשרים את ההתקנה. ההרשאה הזאת היא לאפליקציה אחת בלבד ואפשר לכבות אותה אחר כך.
4. **ואז יופיע מסך של Google Play Protect** שאומר "האפליקציה נחסמה כדי להגן על המכשיר". זה השלב שעוצר אנשים, אז שווה לקרוא אותו לאט:
   - הכפתור הגדול **"הבנתי"** מבטל את ההתקנה. הוא לא ממשיך.
   - לוחצים על **"פרטים נוספים"** (החץ הקטן למטה), ואז מופיעה שורת טקסט קטנה: **"אני רוצה להתקין"**. עליה לוחצים.
   - Play Protect חוסם כי הוא לא מכיר את המפתח, וזה נכון — האפליקציה עוד לא בחנות. זה לא סימן שמשהו לא בסדר בקובץ.
4. פותחים את PushApp, בוחרים שפה במסך הראשון, וממשיכים לשאלון.

שני דברים ששווה לדעת מראש:

- **עדכונים מגיעים לבד.** כשאנחנו מפרסמים, פתיחה של האפליקציה מורידה את העדכון ברקע והוא נכנס לפעולה בפתיחה הבאה. אז אם משהו נראה לא תקין — לסגור לגמרי, לפתוח שוב, ורק אז לספר לנו. יכול להיות שאתה גרסה אחת אחורה.
- **אם משהו לא עובד, יש איפה להגיד את זה מתוך האפליקציה**: הגדרות ← עזרה ומשוב. זה שולח לנו את מה שכתבת ואת הגרסה שרצה אצלך, ושום דבר מהמסעות, מהכלים או מהשיחות שלך. זה עדיף על הודעה, כי הגרסה נצמדת לדיווח לבד ואנחנו יודעים בדיוק על איזה עותק של האפליקציה מדובר.

---

## English

The app is not in the Play Store yet, so the install is a direct one. Three minutes, and Android will
ask you to confirm something along the way — normal for an app that did not come from the store.

1. **On the phone itself** (not a desktop), open **https://pushapp-invite.expo.app**
2. Tap **Install for Android**. It opens the build page and downloads the file.
3. Android will say it does not usually allow installs from this source and offer a **Settings**
   button. Allow it for the browser you are using, come back, and confirm the install. That
   permission is per-app and you can switch it off afterwards.
4. **Then Google Play Protect appears** — "the app was blocked to protect your device". This is the
   step that stops people, so read it slowly:
   - The big **"Got it"** button CANCELS the install. It does not continue.
   - Tap **"More details"** (the small chevron), and a plain line of text appears:
     **"Install anyway"** / **"I want to install"**. That is the one to tap.
   - Play Protect blocks because it does not recognise the developer, which is correct — the app is
     not in the store yet. It is not a sign that anything is wrong with the file.
5. Open PushApp, choose your language on the first screen, and the questionnaire follows.

Two things worth knowing:

- **Updates arrive on their own.** When we publish, opening the app downloads it in the background
  and it takes effect the next time you open it. So if something looks wrong, close it completely and
  open it again before telling us — you may be a version behind.
- **If something is wrong, there is a way to say so from inside the app**: Settings → Help and
  feedback. It sends what you wrote and the version you were running, and nothing from your Journeys,
  tools or conversations. Better than a message, because the version attaches itself and we can tell
  exactly which copy of the app you were looking at.

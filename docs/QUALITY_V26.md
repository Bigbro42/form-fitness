# FORM. V26 — quality review (29 October 2026)

## Scope delivered
- One anatomy interface: the licensed, interactive gender-neutral 2D muscle atlas. Male/female switches and old schematic selector are removed from the rendered view, but legacy saved sex data is not deleted.
- 99 new exercise records added to the existing 25, for 124 total. Each new record has a name, primary muscles, equipment, modality, suggested initial target, short technique guidance and simpler/harder variants. Exercise names/technique descriptions are curated app content, not independently clinically validated.
- Search/filter exercise library by name, muscle, equipment and modality, with add-to-normal or add-to-random workout.
- Eight general goals and session-level goals. A workout session can override the general goal; recurring strength events can inherit a series-specific goal.
- Goal-sensitive recommendation display: strength, hypertrophy, muscular endurance, cardio, core, mobility and function are not presented as the same repetitions. Cardio records are tracked in minutes, holds in seconds.
- Random generator considers the chosen goal, time, training focus and selected equipment, and stores its session goal without changing older history records.
- 22 new local JPG files supporting 11 carefully matched resistance movements. Missing images remain labeled; no unrelated movement is substituted.

## Validation run
- JavaScript syntax: node --check.
- Isolated Chromium interactive tests at 320, 390 and 430 px: global goal, searchable library, equipment filtering, session goal, add exercise, detail recommendations, cardio random workout, absence of browser script errors and horizontal overflow.
- Repeating weekly workout goal and one gender-neutral body view tested in isolated Chromium.
- 10-minute cardio program checked: time recommendations per cardio exercise align with selected session length instead of showing 8–20 minutes for each short interval.
- GitHub repository verified to contain the JS, CSS, image files, index references and precache entries.

## Known limitations and next priority
1. The library includes many exercises without verified demonstration photos. The atlas indicates muscle regions, not a technique video.
2. Goal-adjusted repetition and pause recommendations are general heuristics, not personalized %1RM estimates, medical advice, or a substitute for a qualified trainer.
3. Real iPhone Safari and standalone-PWA regression tests are not yet complete; GitHub Pages deployment not independently verified.
4. Core architecture remains multiple scripts layered onto a legacy single HTML app. Refactor and migration-safe data schema are still necessary.
5. The photo helper remains photo-assisted manual exercise selection, not true AI image recognition.
6. Local browser storage remains a limitation. JSON backups are essential; there is no remote sync or automatic cloud backup.

## Evidence guiding broad prescriptions
- ACSM 2026 Position Stand: https://pubmed.ncbi.nlm.nih.gov/41843416/
- Austrian guidelines: https://www.gesundheit.gv.at/leben/bewegung/gesund-durch-sport/bewegungsempfehlungen-erwachsene.html
- Training principles favor regularity, progressive load, manageable weekly volume and individual adaptation; exact repetitions are not rigid universal prescriptions.
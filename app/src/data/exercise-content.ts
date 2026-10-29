/**
 * Curated library content for the built-in exercises, keyed by the stable legacy ids.
 *
 * Written for this app (German), based on common coaching cues; not reviewed by a licensed
 * trainer or physiotherapist – the app says so. Photos: only verified matches from Free
 * Exercise DB (Unlicense); `photo` is the folder in /media/exercises.
 */
import type { MuscleRegion } from '../domain/muscles';

export type Pattern =
  | 'squat' | 'hinge' | 'lunge' | 'bridge' | 'push-h' | 'push-v' | 'pull-h' | 'pull-v' | 'arms' | 'calves'
  | 'core-stab' | 'core-flex' | 'core-rot' | 'carry' | 'cardio' | 'mobility' | 'stretch';

export interface Content {
  en: string;
  aliases?: string[];
  p: MuscleRegion[];
  s?: MuscleRegion[];
  pattern: Pattern;
  /** 1 = Einsteiger, 2 = Fortgeschritten, 3 = Erfahren */
  level: 1 | 2 | 3;
  steps: string[];
  mistakes: string[];
  breath?: string;
  photo?: string;
}

export const CONTENT: Record<string, Content> = {
  squat: { en: 'Bodyweight Squat', aliases: ['air squat', 'kniebeuge'], p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], pattern: 'squat', level: 1,
    steps: ['Füße etwa hüftbreit, Zehen leicht nach außen.', 'Hüfte nach hinten und unten führen, als würdest du dich setzen.', 'Knie zeigen in Richtung der Zehen, Fersen bleiben am Boden.', 'So tief gehen, wie der Rücken neutral bleibt, dann über die ganze Fußsohle aufstehen.'],
    mistakes: ['Knie fallen nach innen.', 'Fersen heben ab oder der Rücken rundet sich unten stark.'], photo: 'Bodyweight_Squat' },
  bridge: { en: 'Glute Bridge', aliases: ['hip bridge', 'beckenheben', 'hüftheben'], p: ['glutes'], s: ['hamstrings', 'lowerback'], pattern: 'bridge', level: 1,
    steps: ['Rückenlage, Füße hüftbreit nah am Gesäß aufstellen.', 'Bauch leicht anspannen und über die Fersen das Becken heben.', 'Oben Knie, Hüfte und Schultern in einer Linie, Gesäß 1–2 Sekunden fest.', 'Langsam Wirbel für Wirbel absenken.'],
    mistakes: ['Ins Hohlkreuz drücken statt das Gesäß anzuspannen.', 'Knie fallen nach außen oder innen.'], photo: 'Butt_Lift_Bridge' },
  lunge: { en: 'Reverse Lunge', aliases: ['rückwärts ausfallschritt', 'ausfallschritt'], p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], pattern: 'lunge', level: 1,
    steps: ['Aufrecht stehen, ein Bein großen Schritt nach hinten setzen.', 'Hinteres Knie Richtung Boden senken, Oberkörper aufrecht.', 'Vorderes Knie bleibt über dem Fuß.', 'Über die vordere Ferse zurück in den Stand drücken.'],
    mistakes: ['Zu kurzer Schritt, das vordere Knie schiebt weit über die Zehen.', 'Oberkörper kippt nach vorn oder seitlich.'] },
  deadbug: { en: 'Dead Bug', aliases: ['toter käfer'], p: ['abs'], s: ['hipflexors', 'obliques'], pattern: 'core-stab', level: 1,
    steps: ['Rückenlage, Arme zur Decke, Hüfte und Knie 90° gebeugt.', 'Unteren Rücken sanft Richtung Boden drücken.', 'Gegenüberliegenden Arm und Bein langsam absenken, ohne dass der Rücken abhebt.', 'Zurückführen und Seite wechseln.'],
    mistakes: ['Hohlkreuz beim Absenken.', 'Zu schnell und mit Schwung ausführen.'], photo: 'Dead_Bug' },
  pushup: { en: 'Incline Push-Up', aliases: ['liegestütz erhöht', 'push up', 'liegestütze'], p: ['chest'], s: ['triceps', 'shoulders', 'abs'], pattern: 'push-h', level: 1,
    steps: ['Hände etwas breiter als schulterbreit auf eine stabile Erhöhung.', 'Körper von Kopf bis Fuß in einer Linie, Bauch und Gesäß fest.', 'Ellenbogen etwa 45° vom Körper, Brust zur Kante senken.', 'Kontrolliert zurückdrücken.'],
    mistakes: ['Hüfte hängt durch oder ragt nach oben.', 'Ellenbogen stehen weit seitlich ab.'], photo: 'Incline_Push-Up_Medium' },
  snow: { en: 'Prone Reverse Snow Angel', aliases: ['snow angels', 'schneeengel'], p: ['upperback'], s: ['shoulders', 'lowerback'], pattern: 'pull-h', level: 1,
    steps: ['Bauchlage, Stirn knapp über dem Boden, Arme neben dem Körper.', 'Arme leicht vom Boden abheben, Schulterblätter nach hinten unten.', 'Arme in einem Bogen über die Seite Richtung Kopf führen.', 'Ebenso langsam zurück.'],
    mistakes: ['Kopf in den Nacken legen.', 'Schultern zu den Ohren ziehen.'] },
  hinge: { en: 'Bodyweight Good Morning', aliases: ['hip hinge', 'hüftbeuge'], p: ['hamstrings', 'glutes'], s: ['lowerback'], pattern: 'hinge', level: 1,
    steps: ['Hüftbreiter Stand, Hände an der Brust oder hinter dem Kopf.', 'Knie leicht beugen, Gesäß nach hinten schieben.', 'Oberkörper mit geradem Rücken neigen, bis die Rückseite der Beine spannt.', 'Über das Gesäß zurück aufrichten.'],
    mistakes: ['Rücken rundet sich.', 'Bewegung aus den Knien statt aus der Hüfte.'] },
  sideplank: { en: 'Side Plank', aliases: ['seitstütz'], p: ['obliques'], s: ['abs', 'shoulders', 'glutes'], pattern: 'core-stab', level: 1,
    steps: ['Seitlage, Ellenbogen unter der Schulter.', 'Beine gestreckt übereinander oder Knie gebeugt (leichter).', 'Becken heben, bis der Körper eine gerade Linie bildet.', 'Halten, ruhig atmen, Seite wechseln.'],
    mistakes: ['Becken sinkt ab oder kippt nach hinten.', 'Schulter sackt ein.'], photo: 'Side_Bridge' },
  plank: { en: 'Plank', aliases: ['unterarmstütz', 'planke'], p: ['abs'], s: ['obliques', 'shoulders', 'glutes'], pattern: 'core-stab', level: 1,
    steps: ['Unterarme unter den Schultern, Füße hüftbreit.', 'Körper anheben, Kopf bis Fersen in einer Linie.', 'Bauch und Gesäß anspannen, Blick zum Boden.', 'Halten, solange die Linie sauber bleibt.'],
    mistakes: ['Hüfte hängt durch (Hohlkreuz).', 'Gesäß zu hoch oder Luft anhalten.'], photo: 'Plank' },
  calf: { en: 'Standing Calf Raise', aliases: ['wadenheben', 'calf raises'], p: ['calves'], pattern: 'calves', level: 1,
    steps: ['Aufrecht stehen, bei Bedarf an einer Wand abstützen.', 'Über die Fußballen langsam auf die Zehenspitzen drücken.', 'Oben kurz halten.', 'Langsam und vollständig absenken.'],
    mistakes: ['Wippen mit Schwung.', 'Gewicht rollt auf die Außenkante des Fußes.'] },
  bird: { en: 'Bird Dog', aliases: ['vierfüßlerstand diagonal'], p: ['lowerback', 'abs'], s: ['glutes', 'shoulders'], pattern: 'core-stab', level: 1,
    steps: ['Vierfüßlerstand, Hände unter den Schultern, Knie unter der Hüfte.', 'Rücken neutral, Bauch leicht anspannen.', 'Gegenüberliegenden Arm und Bein langsam strecken, bis sie in Linie mit dem Rumpf sind.', 'Kurz halten, zurückführen, Seite wechseln.'],
    mistakes: ['Becken kippt zur Seite.', 'Bein zu hoch heben und ins Hohlkreuz gehen.'] },
  wall: { en: 'Wall Sit', aliases: ['wandsitzen', 'stuhl an der wand'], p: ['quads'], s: ['glutes'], pattern: 'squat', level: 1,
    steps: ['Rücken an die Wand, Füße etwa einen halben Meter davor.', 'An der Wand nach unten rutschen, bis die Knie etwa 90° gebeugt sind.', 'Knie über den Fersen, Gewicht auf der ganzen Sohle.', 'Halten und ruhig atmen.'],
    mistakes: ['Knie schieben weit über die Zehen.', 'Hände drücken auf die Oberschenkel.'] },
  superman: { en: 'Superman', aliases: ['rückenheben bauchlage', 'back extension'], p: ['lowerback'], s: ['glutes', 'upperback'], pattern: 'core-stab', level: 1,
    steps: ['Bauchlage, Arme nach vorn gestreckt, Stirn knapp über dem Boden.', 'Gesäß anspannen und Arme und Beine leicht abheben.', 'Kurz halten, Nacken lang lassen.', 'Langsam ablegen.'],
    mistakes: ['Kopf weit in den Nacken legen.', 'Mit Schwung hochreißen.'], photo: 'Superman' },
  pike: { en: 'Pike Push-Up', aliases: ['pike liegestütz', 'schulter liegestütz'], p: ['shoulders'], s: ['triceps', 'upperback'], pattern: 'push-v', level: 2,
    steps: ['Aus dem Liegestütz die Hüfte hoch schieben, umgedrehtes V.', 'Hände schulterbreit, Kopf zwischen den Armen.', 'Ellenbogen beugen und den Kopf vor die Hände Richtung Boden senken.', 'Zurückdrücken, bis die Arme gestreckt sind.'],
    mistakes: ['Ellenbogen fallen weit nach außen.', 'Hüfte sinkt ab und es wird ein normaler Liegestütz.'] },
  diamond: { en: 'Close-Grip Incline Push-Up', aliases: ['enge liegestütze', 'trizeps liegestütz'], p: ['triceps'], s: ['chest', 'shoulders'], pattern: 'push-h', level: 1,
    steps: ['Hände schmal (etwa schulterbreit oder enger) auf eine stabile Erhöhung.', 'Körper in einer Linie anspannen.', 'Ellenbogen eng am Körper beugen.', 'Kraftvoll zurückdrücken.'],
    mistakes: ['Ellenbogen spreizen sich ab.', 'Hohlkreuz.'], photo: 'Incline_Push-Up_Close-Grip' },
  split: { en: 'Split Squat', aliases: ['ausfallschritt stand', 'statischer ausfallschritt'], p: ['quads', 'glutes'], s: ['adductors'], pattern: 'lunge', level: 1,
    steps: ['Schrittstellung, beide Füße zeigen nach vorn.', 'Hinteres Knie senkrecht Richtung Boden senken.', 'Oberkörper aufrecht, vorderes Knie über dem Fuß.', 'Über das vordere Bein hochdrücken; nach allen Wiederholungen Seite wechseln.'],
    mistakes: ['Stand zu schmal, man wackelt seitlich.', 'Abstoßen mit dem hinteren Bein.'], photo: 'Split_Squats' },
  sidestep: { en: 'Lateral Lunge', aliases: ['seitlicher ausfallschritt', 'side lunge'], p: ['adductors', 'glutes'], s: ['quads'], pattern: 'lunge', level: 1,
    steps: ['Breiter Stand, Zehen nach vorn.', 'Gewicht auf ein Bein verlagern, Hüfte nach hinten schieben und dieses Knie beugen.', 'Das andere Bein bleibt gestreckt.', 'Über das gebeugte Bein zurück in die Mitte drücken.'],
    mistakes: ['Knie schiebt nach innen.', 'Rücken rundet sich.'] },
  singlebridge: { en: 'Single-Leg Glute Bridge', aliases: ['einbeiniges beckenheben'], p: ['glutes'], s: ['hamstrings'], pattern: 'bridge', level: 2,
    steps: ['Rückenlage, ein Fuß aufgestellt, das andere Bein gestreckt angehoben.', 'Über die Ferse des Standbeins das Becken heben.', 'Becken bleibt waagrecht.', 'Kontrolliert absenken.'],
    mistakes: ['Becken kippt zur Seite des freien Beins.', 'Hohlkreuz statt Gesäßspannung.'], photo: 'Single_Leg_Glute_Bridge' },
  heeltoe: { en: 'Single-Leg Calf Raise', aliases: ['einbeiniges wadenheben'], p: ['calves'], pattern: 'calves', level: 2,
    steps: ['Auf einem Bein stehen, mit einer Hand an der Wand stabilisieren.', 'Langsam auf den Fußballen hochdrücken.', 'Oben kurz halten.', 'Über etwa 2–3 Sekunden absenken.'],
    mistakes: ['Knie beugt sich zum Mitschwingen.', 'Nur halber Bewegungsumfang.'] },
  heeltilt: { en: 'Alternate Heel Touchers', aliases: ['heel taps', 'fersen tippen'], p: ['obliques'], s: ['abs'], pattern: 'core-flex', level: 1,
    steps: ['Rückenlage, Knie gebeugt, Füße am Boden.', 'Schultern leicht vom Boden lösen.', 'Seitlich abwechselnd mit der Hand zur Ferse greifen.', 'Schultern bleiben während des Satzes oben.'],
    mistakes: ['Kopf mit den Händen nach vorn ziehen.', 'Hektisch aus dem Nacken arbeiten.'], photo: 'Alternate_Heel_Touchers' },
  hollow: { en: 'Hollow Hold', aliases: ['hohlkörper halten'], p: ['abs'], s: ['hipflexors'], pattern: 'core-stab', level: 2,
    steps: ['Rückenlage, unteren Rücken fest Richtung Boden drücken.', 'Schultern und Beine leicht anheben.', 'Arme und Beine nur so weit strecken, wie der Rücken am Boden bleibt.', 'Halten und flach weiteratmen.'],
    mistakes: ['Unterer Rücken hebt ab.', 'Kinn auf die Brust pressen.'] },
  wallpush: { en: 'Wall Push-Up', aliases: ['wand liegestütz'], p: ['chest'], s: ['triceps', 'shoulders'], pattern: 'push-h', level: 1,
    steps: ['Mit etwa einem Schritt Abstand vor eine Wand stellen.', 'Hände schulterhoch und etwas breiter als schulterbreit an die Wand.', 'Körper gerade, Brust Richtung Wand senken.', 'Zurückdrücken.'],
    mistakes: ['Hüfte knickt ein.', 'Zu nah an der Wand, kaum Bewegung.'] },
  wallslide: { en: 'Wall Slide', aliases: ['wandrutschen'], p: ['shoulders', 'upperback'], pattern: 'mobility', level: 1,
    steps: ['Rücken, Hinterkopf und Unterarme an die Wand.', 'Arme in U-Position (Ellenbogen etwa auf Schulterhöhe).', 'Arme langsam nach oben gleiten lassen, ohne dass Rippen nach vorn kommen.', 'Ebenso langsam zurück.'],
    mistakes: ['Hohlkreuz, um die Arme höher zu bekommen.', 'Schultern zu den Ohren ziehen.'] },
  pronecobra: { en: 'Prone Cobra', aliases: ['kobra bauchlage'], p: ['upperback'], s: ['lowerback', 'shoulders'], pattern: 'core-stab', level: 1,
    steps: ['Bauchlage, Arme neben dem Körper, Handflächen zum Boden.', 'Brust leicht abheben, Daumen nach außen drehen.', 'Schulterblätter zusammen und nach unten ziehen.', 'Halten, Blick zum Boden.'],
    mistakes: ['Kopf überstrecken.', 'Mit dem unteren Rücken hochreißen.'] },
  bearhold: { en: 'Bear Plank Hold', aliases: ['bärenstand'], p: ['abs'], s: ['shoulders', 'quads'], pattern: 'core-stab', level: 1,
    steps: ['Vierfüßlerstand, Hände unter Schultern, Knie unter Hüfte.', 'Zehen aufstellen, Bauch anspannen.', 'Knie wenige Zentimeter abheben, Rücken bleibt flach.', 'Halten und ruhig atmen.'],
    mistakes: ['Gesäß nach oben schieben.', 'Rücken rundet sich oder hängt durch.'] },
};

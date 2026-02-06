# Wiederholende Aufgaben (Fest vs. Frei)

## Begriffe
- **Freie Aufgabe**: Keine Wiederholung. Wird (wie bisher) über die Dauer in den Tagesplan gemischt und kann per „NEU“-Swipe getauscht werden.
- **Feste Aufgabe**: Hat ein Wiederholungsmuster und damit einen **nächsten Termin**. Feste Aufgaben werden im Tagesplan **vor** freien Aufgaben eingeplant und sind **nicht tauschbar**.

## Wiederholungsmuster
Die App unterstützt folgende Muster:
- Mehrmals pro Woche (Wochentage auswählen)
- Einmal pro Woche (genau ein Wochentag)
- Alle 2 Wochen (genau ein Wochentag)
- Einmal pro Monat (Datum 1–28)
- Einmal pro Quartal
- Einmal pro Halbjahr
- Einmal pro Jahr
- Custom-Intervall (Tage/Wochen/Monate)

Hinweis: Monatstage sind auf **1–28** begrenzt, um ungültige Termine in kurzen Monaten zu vermeiden.

## Planungslogik (max. 3 Aufgaben pro Tag)
- Pro Tag werden **maximal 3 Aufgaben** geplant.
- Sind mehr als 3 feste Aufgaben fällig/überfällig, werden **die ersten 3** (nach Fälligkeit sortiert) eingeplant.
- Der Überhang bleibt als **überfällige Fälligkeit** bestehen und wird am **nächsten Tag** wieder priorisiert eingeplant, bis er abgearbeitet ist.

## Datenmodell (IndexedDB)
Aufgaben werden in `tasks` gespeichert und optional um folgende Felder erweitert:
- `repeat`: Wiederholungsdefinition (z.B. wöchentlich/monatlich/custom)
- `nextDue`: nächstes Fälligkeitsdatum als `YYYY-MM-DD`
- `lastCompletedDue`: zuletzt erledigte Fälligkeit als `YYYY-MM-DD`

Zusätzlich existiert ein Index `tasks.nextDue` zur effizienteren Abfrage von fälligen Aufgaben.

## Edge-Cases & Fehlerbehandlung
- Ungültige Wiederholungsdefinitionen werden beim Berechnen abgefangen und als **nicht wiederholend** behandelt; die Aufgabe bleibt nutzbar.
- Uhrzeit ist optional und dient der Anzeige; die Planung bleibt tagebasiert (max. 3/Tag).


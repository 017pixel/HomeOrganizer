# Changelog

## [1.4.0] - 2026-04-25

### Erstellt
- Wochen-Navigation mit Pfeilen und Swipe-Geste fuer vorherige/nachste Wochen
- Interaktive Tageskarten mit Modal-Ansicht fuer alle Aufgaben des Tages
- Aufgaben-Overflow Indikator zeigt '+X mehr' wenn mehr als 4 Aufgaben vorhanden
- Sticky Wochen-Navigationsleiste zeigt Kalenderwoche und Datumsbereich
- Tages-Modal mit Zusammenfassung Aufgabenzahl und Gesamtdauer

### Verändert
- Handy Hochformat Layout: 3-Tage-Bloecke (Mo-Mi / Do-Sa / So) statt horizontalem Scrollen
- Fold 5 aufgeklappt: 7-Spalten Grid ab 520px statt horizontalem Scrollen
- CSS Breakpoints angepasst: 520px statt 768px fuer Grid-Umschaltung
- Schriftgroesse auf mindestens 12px angehoben fuer bessere Lesbarkeit
- Wochen-Label aus Scroll-Container entfernt und als sticky Ueberschrift platziert

### Gelöscht
- Horizontales Scrollen in der Wochenuebersicht auf allen Bildschirmen
- Feste Kartenhoehe von 170px auf Mobile

---

## [1.3.0] - 2026-04-24

### Erstellt
- Mobile Wochenuebersicht mit horizontal scrollbaren Kartenreihen
- Feste Karten-Groesse mit Seitenverhaeltnis fuer alle Bildschirmgroessen

### Verändert
- Wochenuebersicht CSS komplett ueberarbeitet fuer Handy und Fold 5
- Task-Texte umbrechen nicht mehr vertikal, sondern mit Ellipsis
- Mobile: 7 Tage als swipebare Kartenreihe statt eingequetschtem Grid
- Tablet/Desktop: 7-Spalten Grid mit max-height statt endlos langen Karten

---

## [1.2.0] - 2026-04-24

### Erstellt
- Automatische 14-Tage-Vorausplanung fuer feste und freie Aufgaben
- Neue Plaene werden bei Task-Aenderungen automatisch neu generiert
- Wochenuebersicht zeigt jetzt alle geplanten Aufgaben aus der Datenbank

### Verändert
- Scheduler erweitert um `ensurePlansForDays` und `regenerateFuturePlans`
- Wochenuebersicht CSS zentriert und Fold 5 Optimierung verbessert
- `renderWeekOverview` liest jetzt direkt aus `dailyPlans` statt live zu berechnen
- Zukünftige Plaene werden ab morgen neu generiert, heutiger Plan bleibt erhalten
- App-Start sichert jetzt automatisch Plaene fuer die naechsten 14 Tage

### Gelöscht
- Keine Eintraege

---

## [1.1.0] - 2026-04-24

### Erstellt
- Wochenübersicht als 5. Tab hinzugefuegt
- Kalender-Grid-Ansicht fuer 2 Wochen mit Montags-Start
- Anzeige fester und freier Aufgaben pro Tag
- Samsung Galaxy Z Fold 5 Optimierung fuer aufgeklapptes Display
- Unit-Tests und Visual-Tests fuer Wochenuebersicht erstellt

### Verändert
- Tab-Logik erweitert um Wochenuebersicht
- Recurrence-Engine um Export-Funktionen erweitert
- Design-System um Grid-Styles fuer Wochenansicht erweitert
- Icons um Calendar-Month Icon ergaenzt
- Version wird im Einstellungsbereich angezeigt

### Gelöscht
- Keine Eintraege
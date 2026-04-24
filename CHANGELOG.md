# Changelog

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
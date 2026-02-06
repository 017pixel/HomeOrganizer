# UI VERBESSERUNGEN - Neo-Brutalism Design System

## 🎯 Hauptziel
Überarbeite die gesamte Progressive Web App (PWA) im Neo-Brutalism-Stil mit dunklem/hellem Pastelgrün als Akzentfarbe. Die App ist mobile-optimiert und benötigt eine vollständige visuelle Transformation aller UI-Elemente.

---

## 📱 App-Kontext
- **Typ**: Progressive Web App (PWA)
- **Optimierung**: Mobile-First
- **Hauptkomponenten**: 
  - Navigation Bar
  - Buttons (verschiedene Typen)
  - Karteikarten-Elemente
  - Einstellungen mit Toggle-Schaltern
  - Formulare und Eingabefelder

---

## 🎨 Neo-Brutalism Design-Prinzipien

### Kernmerkmale des Neo-Brutalism
1. **Dicke, schwarze Borders** (3-5px) um alle interaktiven Elemente
2. **Harte Schatten** (keine weichen box-shadows, nur offset-Schatten in schwarz)
3. **Flache, kräftige Farben** ohne Farbverläufe
4. **Geometrische Formen** mit klaren Kanten (keine border-radius oder maximal 4-8px)
5. **Hoher Kontrast** zwischen Elementen
6. **Überlappende Elemente** mit z-index-Layering
7. **Asymmetrische Layouts** wo sinnvoll
8. **Grobe, expressive Typografie**

### Verbotene Elemente
❌ Weiche box-shadows (blur)
❌ Große border-radius Werte (>8px)
❌ Farbverläufe (gradients)
❌ Transparenzen/Opazität für Hauptelemente
❌ Minimalistische "unsichtbare" Designs
❌ Zu viel Weißraum

---

## 🌓 Farbschema

### Dark Mode (Standard)
```css
:root[data-theme="dark"] {
  /* Hauptfarben */
  --bg-primary: #1a1a1a;           /* Haupt-Hintergrund */
  --bg-secondary: #2d2d2d;         /* Sekundärer Hintergrund */
  --bg-tertiary: #3a3a3a;          /* Karteikarten, erhöhte Elemente */
  
  /* Akzentfarbe - Dunkles Pastelgrün */
  --accent-primary: #6b9080;       /* Haupt-Akzent */
  --accent-dark: #4a6b5e;          /* Dunklere Variante */
  --accent-light: #8fad9e;         /* Hellere Variante */
  
  /* Text */
  --text-primary: #f5f5f5;         /* Haupttext */
  --text-secondary: #c0c0c0;       /* Sekundärtext */
  --text-tertiary: #8a8a8a;        /* Tertiärtext */
  
  /* Borders & Schatten */
  --border-color: #000000;         /* Schwarze Borders */
  --shadow-color: #000000;         /* Schwarze Schatten */
  
  /* Status-Farben */
  --success: #6b9080;              /* Pastelgrün */
  --error: #e07a5f;                /* Warmes Koralle */
  --warning: #f4a261;              /* Orange */
  --info: #81b29a;                 /* Helles Grün */
}
```

### Light Mode
```css
:root[data-theme="light"] {
  /* Hauptfarben */
  --bg-primary: #f9f9f9;           /* Haupt-Hintergrund */
  --bg-secondary: #ffffff;         /* Sekundärer Hintergrund */
  --bg-tertiary: #e8e8e8;          /* Karteikarten */
  
  /* Akzentfarbe - Helles Pastelgrün */
  --accent-primary: #a8dadc;       /* Haupt-Akzent */
  --accent-dark: #81b29a;          /* Dunklere Variante */
  --accent-light: #c8e6e7;         /* Hellere Variante */
  
  /* Text */
  --text-primary: #1a1a1a;         /* Haupttext */
  --text-secondary: #4a4a4a;       /* Sekundärtext */
  --text-tertiary: #7a7a7a;        /* Tertiärtext */
  
  /* Borders & Schatten */
  --border-color: #000000;         /* Schwarze Borders */
  --shadow-color: #000000;         /* Schwarze Schatten */
  
  /* Status-Farben */
  --success: #81b29a;              /* Grün */
  --error: #e76f51;                /* Koralle */
  --warning: #f4a261;              /* Orange */
  --info: #457b9d;                 /* Blau */
}
```

---

## 🔤 Typografie

### Schriftarten
```css
/* Primäre Schriftart - Grotesque/Neo-Grotesk */
--font-primary: 'Space Grotesk', 'Inter', 'Arial Black', sans-serif;

/* Sekundäre Schriftart - Monospace für Code/technisch */
--font-mono: 'Space Mono', 'Courier New', monospace;

/* Akzent-Schriftart - Bold und expressiv */
--font-display: 'Archivo Black', 'Impact', sans-serif;
```

### Schriftgrößen & Gewichte
```css
/* Mobile-optimierte Größen */
--text-xs: 12px;     /* Kleine Labels */
--text-sm: 14px;     /* Sekundärtext */
--text-base: 16px;   /* Body-Text */
--text-lg: 18px;     /* Subheadings */
--text-xl: 24px;     /* Headings */
--text-2xl: 32px;    /* Große Überschriften */
--text-3xl: 40px;    /* Display-Text */

/* Gewichte */
--font-normal: 400;
--font-medium: 500;
--font-bold: 700;
--font-black: 900;
```

### Typografie-Regeln
```css
body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: 1.5;
  letter-spacing: -0.01em;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: var(--font-black);
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-transform: uppercase; /* Optional, für stärkeren Effekt */
}
```

---

## 🧩 Komponenten-Spezifikationen

### 1. Navigation Bar

#### Anforderungen
- Fixed am oberen Rand
- Dicke Border unten (4px schwarz)
- Harter Schatten nach unten
- Mobile-optimiert (max. 3-4 Icons/Links)
- Hamburger-Menü für zusätzliche Navigation

#### Code-Vorlage
```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 4px solid var(--border-color);
  box-shadow: 0 4px 0 var(--shadow-color);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.navbar__logo {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-black);
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.navbar__menu-btn {
  width: 44px;
  height: 44px;
  background: var(--accent-primary);
  border: 3px solid var(--border-color);
  box-shadow: 3px 3px 0 var(--shadow-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.navbar__menu-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--shadow-color);
}
```

---

### 2. Buttons

#### Button-Varianten
1. **Primary Button** - Hauptaktionen (Pastelgrün)
2. **Secondary Button** - Sekundäre Aktionen (Grau/Weiß)
3. **Danger Button** - Destruktive Aktionen (Rot/Koralle)
4. **Ghost Button** - Tertiäre Aktionen (nur Border)
5. **Icon Button** - Runde Icon-Buttons

#### Code-Vorlagen

##### Primary Button
```css
.btn-primary {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 24px;
  
  /* Visuals */
  background: var(--accent-primary);
  color: var(--text-primary);
  border: 3px solid var(--border-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
  
  /* Typography */
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  /* Interaction */
  cursor: pointer;
  transition: all 0.1s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.btn-primary:hover {
  background: var(--accent-dark);
}

.btn-primary:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--shadow-color);
}

.btn-primary:disabled {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}
```

##### Secondary Button
```css
.btn-secondary {
  /* Gleiche Basis wie primary */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 24px;
  
  /* Unterschiedliche Farben */
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 3px solid var(--border-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
  
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  
  cursor: pointer;
  transition: all 0.1s ease;
}

.btn-secondary:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--shadow-color);
}
```

##### Icon Button
```css
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  
  background: var(--accent-primary);
  border: 3px solid var(--border-color);
  border-radius: 4px; /* Minimal für Icons */
  box-shadow: 3px 3px 0 var(--shadow-color);
  
  cursor: pointer;
  transition: all 0.1s ease;
}

.btn-icon:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--shadow-color);
}

.btn-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
```

---

### 3. Karteikarten (Cards)

#### Anforderungen
- Klare Abgrenzung vom Hintergrund
- Dicke Border
- Asymmetrischer Schatten
- Stapelbarer Look
- Touch-optimiert (min. 44px Touchpoints)

#### Code-Vorlage
```css
.card {
  /* Layout */
  display: flex;
  flex-direction: column;
  min-height: 120px;
  padding: 20px;
  margin-bottom: 20px;
  
  /* Visuals */
  background: var(--bg-tertiary);
  border: 4px solid var(--border-color);
  box-shadow: 6px 6px 0 var(--shadow-color);
  
  /* Interaction */
  transition: all 0.15s ease;
}

.card:active {
  transform: translate(3px, 3px);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--border-color);
}

.card__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-black);
  color: var(--accent-primary);
  text-transform: uppercase;
}

.card__body {
  flex: 1;
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--text-primary);
}

.card__footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid var(--border-color);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Variante: Highlighted Card */
.card--highlight {
  background: var(--accent-primary);
  border-color: var(--border-color);
  box-shadow: 8px 8px 0 var(--shadow-color);
}

.card--highlight .card__title {
  color: var(--bg-primary);
}

.card--highlight .card__body {
  color: var(--bg-primary);
}
```

---

### 4. Toggle-Schalter (Einstellungen)

#### Anforderungen
- Klarer ON/OFF Status
- Neo-brutalistisches Design mit dicken Borders
- Großer Touch-Target (min. 44px)
- Animierte Transition
- Farbwechsel bei Status-Änderung

#### Code-Vorlage
```css
.toggle-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-tertiary);
  border: 3px solid var(--border-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
  margin-bottom: 16px;
}

.toggle-label {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.toggle {
  position: relative;
  width: 64px;
  height: 34px;
  background: var(--bg-secondary);
  border: 3px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  background: var(--text-tertiary);
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
}

.toggle__input:checked + .toggle {
  background: var(--accent-primary);
}

.toggle__input:checked + .toggle .toggle__slider {
  transform: translateX(30px);
  background: var(--bg-primary);
}

.toggle:active .toggle__slider {
  width: 30px;
}
```

---

### 5. Eingabefelder (Input Fields)

#### Code-Vorlage
```css
.input-group {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-field {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 3px solid var(--border-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
  
  font-family: var(--font-primary);
  font-size: var(--text-base);
  
  transition: all 0.15s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 4px 4px 0 var(--accent-primary);
}

.input-field::placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

.input-field:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Error State */
.input-field--error {
  border-color: var(--error);
  box-shadow: 4px 4px 0 var(--error);
}

.input-error-message {
  display: block;
  margin-top: 8px;
  font-size: var(--text-sm);
  color: var(--error);
  font-weight: var(--font-medium);
}
```

---

### 6. Badges & Tags

#### Code-Vorlage
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  
  background: var(--accent-primary);
  border: 2px solid var(--border-color);
  box-shadow: 2px 2px 0 var(--shadow-color);
  
  font-family: var(--font-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge--success {
  background: var(--success);
}

.badge--error {
  background: var(--error);
}

.badge--warning {
  background: var(--warning);
}
```

---

### 7. Modal / Dialog

#### Code-Vorlage
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  
  background: var(--bg-primary);
  border: 5px solid var(--border-color);
  box-shadow: 12px 12px 0 var(--shadow-color);
  
  animation: modalSlideIn 0.2s ease;
}

@keyframes modalSlideIn {
  from {
    transform: translate(-12px, -12px);
    opacity: 0;
  }
  to {
    transform: translate(0, 0);
    opacity: 1;
  }
}

.modal__header {
  padding: 20px;
  border-bottom: 4px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--accent-primary);
}

.modal__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-black);
  color: var(--bg-primary);
  text-transform: uppercase;
}

.modal__close {
  width: 36px;
  height: 36px;
  background: var(--bg-primary);
  border: 3px solid var(--border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__body {
  padding: 20px;
}

.modal__footer {
  padding: 20px;
  border-top: 3px solid var(--border-color);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

---

## 📏 Layout & Spacing

### Spacing-System
```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
}
```

### Container & Grid
```css
.container {
  width: 100%;
  max-width: 100%;
  padding: 0 var(--space-md);
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

.grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid--2 {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 🎭 Animationen & Transitions

### Basis-Animationen
```css
/* Micro-Interactions */
.interactive-element {
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.interactive-element:active {
  transform: translate(var(--shadow-x), var(--shadow-y));
  box-shadow: 0 0 0 var(--shadow-color);
}

/* Hover-Effekte (nur Desktop) */
@media (hover: hover) {
  .card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 8px 8px 0 var(--shadow-color);
  }
}

/* Loading Animation */
@keyframes brutalistPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.loading {
  animation: brutalistPulse 1s ease-in-out infinite;
}
```

---

## 🔧 Implementierungs-Checkliste

### Phase 1: Basis-Setup
- [ ] CSS-Variablen für Dark/Light Mode einrichten
- [ ] Schriftarten importieren (Google Fonts oder lokal)
- [ ] Base-Reset und globale Styles definieren
- [ ] Theme-Switcher implementieren

### Phase 2: Komponenten
- [ ] Navigation Bar umbauen
- [ ] Alle Button-Varianten erstellen
- [ ] Karteikarten-Komponenten überarbeiten
- [ ] Toggle-Schalter neu gestalten
- [ ] Eingabefelder anpassen
- [ ] Badges/Tags hinzufügen
- [ ] Modal/Dialog-Komponenten

### Phase 3: Layout
- [ ] Container-System implementieren
- [ ] Grid-System für responsive Layouts
- [ ] Spacing-System anwenden
- [ ] Mobile Navigation optimieren

### Phase 4: Interaktionen
- [ ] Touch-Interaktionen verfeinern
- [ ] Animationen hinzufügen
- [ ] Focus-States für Accessibility
- [ ] Loading-States implementieren

### Phase 5: Testing
- [ ] Mobile-Testing auf verschiedenen Geräten
- [ ] Dark/Light Mode Switching testen
- [ ] Performance optimieren
- [ ] Accessibility überprüfen

---

## 📱 Mobile-Optimierung (Spezifisch)

### Touch-Targets
```css
/* Mindestgröße für alle interaktiven Elemente */
button, a, input, .interactive {
  min-height: 44px;
  min-width: 44px;
}

/* Spacing zwischen Touch-Elementen */
.touch-row {
  display: flex;
  gap: var(--space-sm);
}
```

### Viewport & Meta-Tags
```html
<!-- In HTML <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#6b9080" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#a8dadc" media="(prefers-color-scheme: light)">
```

### Safe Areas (iOS)
```css
.navbar {
  padding-top: env(safe-area-inset-top);
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 🎨 Beispiel: Vollständige Seite

```html
<!DOCTYPE html>
<html lang="de" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neo-Brutalist PWA</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  
  <!-- Navigation -->
  <nav class="navbar">
    <div class="navbar__logo">APP</div>
    <button class="navbar__menu-btn" aria-label="Menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect y="4" width="24" height="3" fill="currentColor"/>
        <rect y="10.5" width="24" height="3" fill="currentColor"/>
        <rect y="17" width="24" height="3" fill="currentColor"/>
      </svg>
    </button>
  </nav>

  <!-- Main Content -->
  <main class="container" style="margin-top: 80px;">
    
    <!-- Card Example -->
    <div class="card">
      <div class="card__header">
        <h2 class="card__title">Beispiel Karte</h2>
        <span class="badge badge--success">Neu</span>
      </div>
      <div class="card__body">
        <p>Dies ist eine Beispiel-Karteikarte im Neo-Brutalism-Stil mit dicken Borders und hartem Schatten.</p>
      </div>
      <div class="card__footer">
        <button class="btn-secondary">Abbrechen</button>
        <button class="btn-primary">Speichern</button>
      </div>
    </div>

    <!-- Toggle Setting -->
    <div class="toggle-wrapper">
      <span class="toggle-label">Dark Mode</span>
      <label class="toggle">
        <input type="checkbox" class="toggle__input" checked>
        <span class="toggle__slider"></span>
      </label>
    </div>

    <!-- Input Example -->
    <div class="input-group">
      <label class="input-label" for="username">Benutzername</label>
      <input type="text" id="username" class="input-field" placeholder="Dein Name">
    </div>

    <!-- Buttons -->
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="btn-primary">Primary</button>
      <button class="btn-secondary">Secondary</button>
      <button class="btn-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4L4 8v12l8 4 8-4V8l-8-4z"/>
        </svg>
      </button>
    </div>

  </main>

</body>
</html>
```

---

## 🚀 Zusätzliche Empfehlungen

### Icons
- **Empfohlene Icon-Sets**: 
  - Lucide Icons (clean, geometric)
  - Remix Icon (extensive)
  - Heroicons (simple)
- **Styling**: Dicke Strokes (2-3px), keine filled Icons außer für aktive States

### Micro-Interactions
- Button Press: Shadow-Collapse-Effekt
- Card Tap: Leichtes Verschieben
- Toggle Switch: Slider-Animation mit Bounce
- Input Focus: Border-Color-Change

### Performance-Tipps
- CSS Custom Properties für Theme-Switching nutzen
- Transform und Opacity für Animationen (GPU-beschleunigt)
- Will-change Property sparsam einsetzen
- Lazy Loading für Bilder

### Accessibility
- Kontrastverhältnis mindestens 4.5:1 für Text
- Focus-Indicators deutlich sichtbar (3px solid border)
- ARIA-Labels für Icon-Buttons
- Keyboard-Navigation vollständig unterstützen

---

## 📝 Abschluss-Notizen

### Was du erreichen wirst:
✅ Eine visuell auffällige, moderne PWA
✅ Konsistentes Design-System
✅ Optimale Mobile-Experience
✅ Hohe Wiedererkennbarkeit
✅ Starke visuelle Hierarchie

### Häufige Fehler vermeiden:
❌ Zu große Border-Radius Werte
❌ Weiche Schatten statt harte Schatten
❌ Zu kleine Touch-Targets (<44px)
❌ Inkonsistente Spacing-Werte
❌ Überladene Animationen

### Nächste Schritte:
1. Dieses Dokument an deinen KI-Agenten übergeben
2. Komponente für Komponente umsetzen
3. In Browser/Mobile testen
4. Iterieren basierend auf Feedback
5. Performance und Accessibility optimieren

---

**Viel Erfolg bei der Umsetzung! 🎨**

*Erstellt: 2026-02-06*
*Version: 1.0*

# Entwicklungsprompt: HomeOrganizer PWA

## Teil 1: Projekt-Vision & Logik

### 1.1 Zielsetzung
Der "HomeOrganizer" ist eine intelligente Web-Applikation (PWA), die darauf spezialisiert ist, die Verwaltung von Haushaltsaufgaben zu automatisieren und zu vereinfachen. Die Kernidee ist, den Nutzer nicht mit einer endlosen To-Do-Liste zu erschlagen, sondern einen kuratierten Tagesplan zu erstellen, der sich an die verfügbare Zeit und die Gewohnheiten des Nutzers anpasst.

### 1.2 Kernfunktionen & Logik
- **Das "3-Aufgaben-Prinzip":** Jeden Tag genau drei Aufgaben. Die Auswahl erfolgt dynamisch basierend auf der verfügbaren Zeit (15, 30, 60 oder 120 Minuten). Die Schwierigkeitsgrade werden optimal kombiniert.
- **Smart Scheduler:** Berechnet die optimale Aufgabenverteilung unter Berücksichtigung der Nutzerverfügbarkeit pro Wochentag. Erlaubt Streak-Freeze und Aufgabentausch innerhalb der Woche.
- **Learning Engine:** Adaptives Lernen durch Analyse von Zeit-Präferenzen, Tages-Präferenzen, Ablehnungsmustern und Dauer-Korrekturen (Vergleich von Schätzung vs. Realität).

### 1.3 Technische Architektur
- **Offline-First PWA:** Vollständige Offline-Funktionalität via Service Worker (`sw.js`).
- **Lokale Datenhaltung:** Keine Cloud. Alle Daten liegen in der **IndexedDB** (`tasks`, `dailyPlans`, `streaks`, `settings`, `learningPatterns`).
- **Responsive Web:** Optimiert für die Nutzung auf mobilen Endgeräten via Browser oder installiertem Manifest.

---

## Teil 2: Mobile Design System & Implementation Guide

I need you to create a mobile design system and implementation guide following Apple-level design aesthetics and modern mobile UX principles:

### 2.1 Project Context
- **App type:** Progressive Web App (PWA) / Responsive Web
- **Industry:** Home Organization & Productivity
- **Target audience:** Users looking for household structure with varied technical proficiency
- **Brand personality:** Premium, accessible, clean, and helpful

### 2.2 Design Decision Framework
For every design element, address:
1. **Purpose**: Why does this element exist?
2. **Hierarchy**: How important is this in the information architecture?
3. **Context**: How does this relate to surrounding elements?
4. **Accessibility**: Can all users interact with this effectively?
5. **Performance**: Does this impact loading or interaction speed?

### 2.3 Apple-Level Design Aesthetics
- Meticulous attention to detail in every element
- Intuitive user experience that feels natural
- Clean, sophisticated visual presentation
- Consistent spacing and alignment throughout
- Premium feel through thoughtful micro-interactions
- Pixel-perfect alignment and spacing
- Consistent interaction patterns across the entire app
- Subtle but meaningful feedback for every user action
- Emotional design that creates positive user feelings

### 2.4 Micro-Interaction Principles
Define for each interaction:
- **Trigger**: What initiates the interaction?
- **Rules**: What happens during the interaction?
- **Feedback**: How does the user know something happened?
- **Loops**: Does the interaction repeat or evolve?
- **Modes**: How does the interaction change the app's state?

### 2.5 Mobile-Specific Requirements

#### Touch Interface Design
- Minimum touch targets: 44x44px (iOS) / 48x48px (Android)
- Touch target spacing: Minimum 8px between interactive elements
- Thumb reach zones: Place primary actions in easy-reach areas
- Gesture conflicts: Avoid competing gestures (swipe vs scroll)
- Haptic feedback: Use sparingly for important confirmations
- Touch feedback: Visual response within 100ms of touch

#### Mobile Navigation Patterns
- **Tab Bar**: Maximum 5 tabs, use "More" for additional options
- **Bottom Sheets**: Modal content from bottom edge
- **Floating Action Button**: Primary action, bottom-right placement
- **Pull-to-Refresh**: Standard pattern for content updates
- **Swipe Actions**: Reveal secondary actions (delete, archive, share)

#### Typography for Mobile
- **Minimum Text Size**: 16px for body text (prevents zoom on iOS)
- **Line Height**: 1.4-1.6 for body text, 1.1-1.3 for headings
- **Measure**: 45-75 characters for optimal readability
- **Font Weight Hierarchy**: Maximum 3 weights for consistency
- **Reading Patterns**: F-pattern for content, Z-pattern for interfaces

#### Mobile Color System
- Primary color ramp (6-9 shades) with accessibility compliance
- Semantic colors (success, warning, error, info)
- Dark mode variations for all colors
- High contrast mode support
- Color independence (never rely solely on color for information)

#### Performance Optimization
- **Critical Rendering Path**: Inline critical CSS, defer non-critical
- **Image Optimization**: WebP format, responsive images, lazy loading
- **Animation Performance**: Use transform and opacity, avoid layout properties
- **60fps Animations**: Hardware acceleration with will-change property
- **Memory Management**: Cleanup event listeners, avoid memory leaks

#### Accessibility Standards
- **WCAG AA Compliance**: 4.5:1 contrast ratio minimum
- **Touch Accessibility**: Large enough targets, clear focus indicators
- **Screen Reader Support**: Semantic markup, ARIA labels
- **Motor Impairments**: No time limits, alternative input methods
- **Cognitive Load**: Simple language, clear instructions, error prevention

#### Advanced Mobile Patterns
- **Progressive Disclosure**: Primary → Secondary → Tertiary information hierarchy
- **Loading States**: Skeleton screens, progressive loading, optimistic updates
- **Error Recovery**: Clear error messages with actionable solutions
- **Form Design**: Single column, smart defaults, inline validation
- **Content Strategy**: Mobile-first content prioritization

---

## Teil 3: Output Requirements
1. Complete mobile design system with color tokens and typography scale
2. Touch interface guidelines with interaction patterns
3. Component library optimized for mobile (buttons, forms, navigation)
4. Animation library with performance-optimized micro-interactions
5. Accessibility checklist and implementation guide
6. Performance optimization recommendations
7. Platform-specific considerations (iOS vs Android vs Web)
8. Testing methodology for mobile experiences

---
**Summary for the AI Agent:**
Fokussiere dich bei der Implementierung auf eine robuste Logik-Trennung zwischen Datenhaltung (`js/db`), Geschäftslogik (`js/logic`) und Benutzeroberfläche (`js/ui`). Die Intelligenz der App liegt in der Reduktion von Komplexität durch die "3-Aufgaben-Regel". Das Design muss ein "Apple-Level" Polishing erreichen, während die App vollständig offline und lokal funktioniert.

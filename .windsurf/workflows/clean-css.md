---
description: clean css
auto_execution_mode: 1
---

# 🎨 NETTOYAGE CSS - MODE STRICT

## 📋 Contexte
Tu es un assistant de nettoyage CSS. Ta mission est d'éliminer les styles inutilisés SANS MODIFIER le rendu visuel de l'application.

---

## ✅ CE QUE TU DOIS FAIRE

### 1. Supprimer les sélecteurs inutilisés
```css
/* ❌ À supprimer (classe jamais utilisée dans le HTML/JSX) */
.unused-button {
  background: blue;
  padding: 10px;
}

#obsolete-id {
  display: none;
}

/* ✅ À conserver (utilisé dans le code) */
.btn-primary {
  background: blue;
  padding: 10px;
}
```

### 2. Supprimer les animations mortes
```css
/* ❌ À supprimer (animation jamais référencée) */
@keyframes unused-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ✅ À conserver (utilisée quelque part) */
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.modal {
  animation: slide-in 0.3s ease;
}
```

### 3. Supprimer les propriétés redondantes ou écrasées
```css
/* ❌ À nettoyer */
.card {
  color: red;
  padding: 10px;
  color: blue; /* écrase la première */
  margin: 0;
  margin: 5px; /* écrase la première */
}

/* ✅ Après nettoyage */
.card {
  padding: 10px;
  color: blue;
  margin: 5px;
}
```

### 4. Supprimer les media queries vides ou inutilisées
```css
/* ❌ À supprimer (vide ou contient que du code mort) */
@media (max-width: 768px) {
  .unused-class {
    display: none;
  }
}

/* ✅ À conserver (contient du code utilisé) */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
  }
}
```

### 5. Nettoyer les commentaires inutiles
```css
/* ❌ À supprimer */
/* Styles */
/* TODO: fix later */
/* .old-code { color: red; } */
/* Auto-generated */

/* ✅ À conserver */
/* HACK: Force GPU acceleration for smoother animations on iOS */
/* z-index: 9999 needed to overlay video player controls */
/* Fallback for browsers without CSS Grid support */
```

### 6. Ajouter de la documentation manquante
```css
/* ✅ Ajouter pour les cas complexes */

/**
 * Layout principal avec Grid
 * - Header fixe en haut
 * - Sidebar responsive (collapse < 768px)
 * - Content area scrollable
 */
.app-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar content";
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr;
  min-height: 100vh;
}

/* IMPORTANT: z-index hierarchy
 * Modal: 1000
 * Dropdown: 100
 * Header: 50
 */
.modal-overlay {
  z-index: 1000;
}
```

---

## ❌ CE QUE TU NE DOIS JAMAIS FAIRE

### 🚫 Interdictions absolues

1. **NE MODIFIE AUCUN RENDU VISUEL**
   ```css
   /* ❌ INTERDIT - Changement de couleurs */
   .button { background: blue; } → .button { background: red; }

   /* ❌ INTERDIT - Changement de dimensions */
   .card { padding: 20px; } → .card { padding: 10px; }

   /* ❌ INTERDIT - Changement de layout */
   .container { display: flex; } → .container { display: grid; }
   ```

2. **NE SUPPRIME PAS LES STYLES GLOBAUX CRITIQUES**
   ```css
   /* ✅ CONSERVER (reset/normalize) */
   * { margin: 0; padding: 0; box-sizing: border-box; }

   /* ✅ CONSERVER (variables CSS) */
   :root {
     --primary-color: #007bff;
     --font-base: 'Inter', sans-serif;
   }

   /* ✅ CONSERVER (base HTML) */
   body { font-family: var(--font-base); line-height: 1.6; }
   ```

3. **NE TOUCHE PAS AUX FRAMEWORKS CSS**
   - Fichiers Tailwind, Bootstrap, Material-UI
   - `node_modules/` CSS
   - Vendor prefixes générés automatiquement

4. **NE CHANGE PAS LA STRUCTURE**
   ```css
   /* ❌ INTERDIT - Réorganisation */
   /* Ne pas réorganiser l'ordre des règles */
   /* Ne pas changer la hiérarchie des sélecteurs */
   /* Ne pas fusionner/diviser les fichiers */
   ```

5. **NE REFACTORISE PAS**
   ```css
   /* ❌ INTERDIT */
   .btn-primary, .btn-secondary { padding: 10px; }
   → Ne pas "optimiser" en fusionnant des règles

   /* ❌ INTERDIT */
   margin-top: 10px; margin-bottom: 10px;
   → Ne pas "améliorer" avec margin: 10px 0;
   ```

---

## 📁 Périmètre d'Action

### ✅ Fichiers à nettoyer
- `src/**/*.css`
- `styles/**/*.css`
- `public/**/*.css`
- `components/**/*.module.css`
- `app/**/*.scss`
- `*.module.scss`

### ❌ Fichiers à ignorer
- `node_modules/`
- `dist/`, `build/`, `.next/static/`
- `tailwind.css`, `bootstrap.css`, `normalize.css`
- `vendor/`, `libs/`
- Fichiers de framework CSS externes

### 🔍 Fichiers source à scanner pour usage
- `**/*.html`
- `**/*.jsx`, `**/*.tsx`
- `**/*.vue`, `**/*.svelte`
- `**/*.js`, `**/*.ts` (className, classList)

---

## 🔄 Processus de Travail

### Méthode étape par étape
```
Pour chaque fichier CSS :

1. SCANNER L'USAGE
   - Chercher toutes les classes dans le HTML/JSX
   - Identifier les IDs utilisés
   - Repérer les animations référencées
   - Lister les custom properties (variables CSS) utilisées

2. ANALYSER
   - Comparer les sélecteurs CSS avec l'usage réel
   - Identifier les règles orphelines
   - Détecter les propriétés redondantes
   - Repérer les commentaires inutiles

3. PROPOSER
   - Lister les sélecteurs à supprimer avec justification
   - Montrer les animations mortes
   - Indiquer les commentaires à nettoyer
   - Suggérer la documentation à ajouter

4. APPLIQUER
   - Supprimer les styles inutilisés
   - Nettoyer les commentaires
   - Ajouter la documentation

5. VALIDER
   - Vérifier la syntaxe CSS
   - Confirmer qu'aucun style visuel n'a changé
```

### Ordre de priorité
1. **Composants isolés** (`components/**/*.module.css`)
2. **Pages spécifiques** (`pages/**/*.css`, `app/**/*.css`)
3. **Utilitaires** (`utils.css`, `helpers.css`)
4. **Layout global** (`layout.css`, `app.css`)
5. **Variables et thèmes en dernier** (`variables.css`, `theme.css`)

---

## 🔍 Techniques de Détection

### Scanner l'usage des classes
```bash
# Rechercher si une classe est utilisée
grep -r "\.card" src/ --include="*.{jsx,tsx,html}"
grep -r "className.*card" src/
grep -r "class=.*card" src/
```

### Vérifier les animations
```bash
# Chercher les références à une animation
grep -r "animation.*fade-in" src/
grep -r "animation-name.*fade-in" src/
```

### Détecter les variables CSS
```bash
# Vérifier l'usage d'une variable
grep -r "var(--primary-color)" src/
```

### Cas particuliers à conserver

#### 1. Classes générées dynamiquement
```javascript
// ✅ CONSERVER le CSS même si pas trouvé par grep
const status = 'active'; // ou 'inactive', 'pending'
<div className={`status-${status}`}>
```

```css
/* À conserver même si pas directement visible */
.status-active { color: green; }
.status-inactive { color: gray; }
.status-pending { color: orange; }
```

#### 2. Classes d'état et pseudo-classes
```css
/* ✅ TOUJOURS CONSERVER */
.button:hover { background: darkblue; }
.input:focus { border-color: blue; }
.checkbox:checked + label { font-weight: bold; }
```

#### 3. Classes utilitaires
```css
/* ✅ CONSERVER (peut être utilisé via JS) */
.hidden { display: none; }
.visible { display: block; }
.text-center { text-align: center; }
```

#### 4. Print styles
```css
/* ✅ CONSERVER */
@media print {
  .no-print { display: none; }
  .page-break { page-break-before: always; }
}
```

---

## ✅ Critères de Validation

### Après chaque modification
- [ ] Le fichier CSS est valide (pas d'erreur de syntaxe)
- [ ] Aucune nouvelle console warning CSS
- [ ] Les classes supprimées ne sont vraiment pas utilisées
- [ ] Le rendu visuel est identique

### Tests visuels obligatoires
```
Pages à vérifier après nettoyage :
1. Page d'accueil
2. Page de connexion/inscription
3. Dashboard principal
4. Pages avec formulaires
5. Modales et overlays
6. Menu mobile (responsive)
7. États hover/focus/active
8. Thème sombre (si applicable)
```

### Validation technique
```bash
# Après nettoyage, vérifier :
npm run build     # Build CSS réussi
npm run lint:css  # Pas de nouvelles erreurs
```

---

## 📊 Format de Rapport

### Pendant le nettoyage
```
📁 Fichier : src/components/Button.module.css

🔍 Analyse :
- 15 sélecteurs trouvés
- 3 sélecteurs inutilisés détectés
- 1 animation jamais utilisée
- 5 commentaires à nettoyer

🔎 Vérification d'usage :
✅ .button → Utilisé dans Button.jsx
✅ .button-primary → Utilisé dans Button.jsx
❌ .button-legacy → Aucune occurrence trouvée
❌ .button-old → Aucune occurrence trouvée
❌ .icon-wrapper → Aucune occurrence trouvée
❌ @keyframes old-spin → Jamais référencée

✂️ Modifications proposées :
1. Supprimer : .button-legacy { ... }
2. Supprimer : .button-old { ... }
3. Supprimer : .icon-wrapper { ... }
4. Supprimer : @keyframes old-spin { ... }
5. Nettoyer : 5 commentaires inutiles
6. Ajouter : Documentation sur z-index hierarchy

💾 Gain : 45 lignes supprimées (120 → 75)

❓ Confirmes-tu ces modifications ? (oui/non)
```

### Résumé final
```
🎨 Nettoyage CSS terminé

📊 Statistiques :
- Fichiers analysés : 28
- Fichiers modifiés : 19
- Lignes supprimées : 1,247
- Sélecteurs supprimés : 163
- Animations supprimées : 12
- Media queries nettoyées : 8
- Commentaires supprimés : 94
- Documentation ajoutée : 23

📉 Réduction :
- Taille CSS avant : 87 KB
- Taille CSS après : 54 KB
- Gain : 38% (-33 KB)

✅ Validation :
- Rendu visuel : identique ✓
- Build CSS : réussi ✓
- Aucune régression détectée ✓
- Prêt pour commit ✓

🖼️ Pages testées :
- [x] Page d'accueil
- [x] Dashboard
- [x] Formulaires
- [x] Mobile (responsive)
- [x] Thème sombre
```

---

## 💡 Règles de Décision

### En cas de doute
```
SI incertain si une classe est utilisée
ALORS → Rechercher dans tout le projet avec grep/search
       → Si aucune occurrence : DEMANDER CONFIRMATION
       → Si doute persiste : CONSERVER

SI une animation semble inutilisée
ALORS → Vérifier usage dans animation, animation-name
       → Vérifier usage dynamique via JS
       → Si vraiment inutilisée : SUPPRIMER

SI un commentaire semble obsolète mais contient du contexte
ALORS → CONSERVER (mieux trop de doc que pas assez)

SI une variable CSS semble inutilisée
ALORS → TOUJOURS CONSERVER (peut être utilisée en fallback)
```

### Cas particuliers - TOUJOURS conserver

#### Variables CSS
```css
/* ✅ TOUJOURS CONSERVER */
:root {
  --primary: #007bff;
  --secondary: #6c757d;
  /* Même si certaines semblent inutilisées */
}
```

#### Reset/Normalize
```css
/* ✅ TOUJOURS CONSERVER */
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
}
```

#### Utilitaires globaux
```css
/* ✅ TOUJOURS CONSERVER */
.sr-only { /* screen reader only */ }
.clearfix::after { /* clear floats */ }
.text-truncate { /* ellipsis overflow */ }
```

#### Print styles
```css
/* ✅ TOUJOURS CONSERVER */
@media print {
  .no-print { display: none; }
}
```

---

## 🎯 Objectif Final

### Avant nettoyage
```css
/* styles/components.css - 150 lignes */

.button { padding: 10px; }
.button-v1 { padding: 8px; } /* Old version, unused */
.btn-old { color: red; } /* Deprecated */
.icon-wrapper { display: flex; } /* Never used */

@keyframes old-fade { /* Unused animation */
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in { /* Used */
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* TODO: refactor this */
.modal {
  animation: slide-in 0.3s;
  /* Old code: display: table; */
}

@media (max-width: 768px) {
  .old-mobile-nav { display: none; } /* Unused */
}
```

### Après nettoyage
```css
/* styles/components.css - 65 lignes */

.button {
  padding: 10px;
}

/**
 * Animation d'entrée pour les modales
 * Durée: 300ms | Easing: ease-in-out
 */
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/**
 * Modal overlay
 * z-index: 1000 (must stay above header which is 50)
 */
.modal {
  animation: slide-in 0.3s;
  z-index: 1000;
}
```

**Gain : 85 lignes supprimées (57% de réduction)**
**Rendu : strictement identique**

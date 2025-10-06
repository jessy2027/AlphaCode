---
description: clean code
auto_execution_mode: 1
---

# 🧹 NETTOYAGE DE CODE - MODE STRICT

## 📋 Contexte
Tu es un assistant de nettoyage de code. Ta mission est d'éliminer le code mort et le bruit SANS MODIFIER le comportement de l'application.

---

## ✅ CE QUE TU DOIS FAIRE

### 1. Supprimer les imports inutilisés
```typescript
// ❌ À supprimer
import { UnusedComponent } from './components';
import React from 'react'; // si jamais utilisé

// ✅ À conserver
import { UsedComponent } from './components';
import type { Config } from './types'; // même si usage indirect
```

### 2. Supprimer les variables/fonctions inutilisées
```typescript
// ❌ À supprimer (privé et jamais appelé)
const UNUSED_CONSTANT = 42;
function helperNeverCalled() { return 'test'; }

// ✅ À conserver (exports publics)
export const API_ENDPOINT = '/api/data';
export function publicAPI() { }
```

### 3. Supprimer le code de debug
```typescript
// ❌ À supprimer
console.log('debug test');
console.debug('data:', data);
debugger;
// alert('test');
```

### 4. Nettoyer les commentaires inutiles
```typescript
// ❌ À supprimer
// TODO: fix this
// Auto-generated code
/* Empty comment */
// const oldCode = 'commented';

// ✅ À conserver
// WORKAROUND: Bug in library v2.3 - remove when fixed
// Regex validates RFC 5322 email format
```

### 5. Ajouter de la documentation manquante
```typescript
// ✅ Ajouter JSDoc aux fonctions publiques sans doc
/**
 * Calcule le hash de signature pour les webhooks
 * @param payload - Données JSON en string
 * @param secret - Clé secrète partagée
 * @returns Hash HMAC-SHA256 en hexadécimal
 */
export function computeSignature(payload: string, secret: string): string {
  // ...
}
```

---

## ❌ CE QUE TU NE DOIS JAMAIS FAIRE

### 🚫 Interdictions absolues
1. **NE MODIFIE AUCUNE LOGIQUE**
   - Pas de changement dans les conditions (if/else)
   - Pas de modification de calculs ou d'algorithmes
   - Pas de changement dans les appels API

2. **NE CHANGE AUCUNE SIGNATURE**
   ```typescript
   // ❌ INTERDIT
   function getData(id: number) // → function getData(id: string)

   // ❌ INTERDIT
   function process(data: Data) // → function process(data: Data, options?: Options)
   ```

3. **NE SUPPRIME PAS LES EXPORTS PUBLICS**
   ```typescript
   // ✅ CONSERVER (même si usage incertain)
   export const CONFIG = { /* ... */ };
   export function utilityFunction() { }
   export class PublicClass { }
   ```

4. **NE TOUCHE PAS AUX FICHIERS DE CONFIG**
   - `package.json`, `tsconfig.json`, `*.config.js/ts`
   - `.env`, `.env.local`, `.env.production`
   - `migrations/`, `prisma/schema.prisma`

5. **NE REFACTORISE PAS**
   - Pas de renommage de variables
   - Pas de restructuration de code
   - Pas d'optimisation de performance
   - Pas de changement de style

---

## 📁 Périmètre d'Action

### ✅ Fichiers à nettoyer
- `src/**/*.{ts,tsx,js,jsx}`
- `app/**/*.{ts,tsx,js,jsx}`
- `lib/**/*.{ts,tsx,js,jsx}`
- `components/**/*.{ts,tsx,js,jsx}`

### ❌ Fichiers à ignorer
- `node_modules/`, `dist/`, `build/`, `.next/`
- `*.config.{js,ts,mjs}`, `package.json`, `tsconfig.json`
- `migrations/`, `prisma/`, `database/`
- `README.md`, `CHANGELOG.md`, `docs/`
- `.env*`, `.git*`

---

## 🔄 Processus de Travail

### Méthode étape par étape
```
Pour chaque fichier :

1. ANALYSER
   - Lister les imports inutilisés
   - Identifier les variables/fonctions non utilisées
   - Repérer les commentaires à nettoyer
   - Vérifier si documentation manquante

2. PROPOSER
   - Montrer ce qui sera supprimé/ajouté
   - Expliquer chaque modification
   - Demander confirmation si doute

3. APPLIQUER
   - Effectuer les modifications
   - Vérifier la syntaxe

4. VALIDER
   - Confirmer que le fichier compile
   - Vérifier qu'aucune logique n'a changé
```

### Ordre de priorité
1. **Fichiers utilitaires** (`utils/`, `lib/`, `helpers/`)
2. **Composants UI** (`components/`)
3. **Pages/Routes** (`pages/`, `app/`, `routes/`)
4. **Logique métier** (`services/`, `api/`)
5. **Fichiers critiques en dernier** (`auth/`, `payment/`, `database/`)

---

## ✅ Critères de Validation

### Après chaque modification
- [ ] Le fichier compile sans erreur
- [ ] Aucune nouvelle erreur TypeScript
- [ ] Les imports sont tous utilisés
- [ ] Aucun export public supprimé
- [ ] Comportement identique

### Après un batch de fichiers
```bash
# Tu demanderas à l'utilisateur de vérifier :
npm run build   # Doit réussir
npm test        # Tous les tests passent
```

---

## 📊 Format de Rapport

### Pendant le nettoyage
```
📁 Fichier : src/components/Button.tsx

🔍 Analyse :
- 3 imports inutilisés détectés
- 1 variable non utilisée
- 2 console.log à supprimer
- Documentation manquante sur 1 fonction

✂️ Modifications proposées :
1. Supprimer : import { unused } from 'lib'
2. Supprimer : const TEMP_VAR = 'test'
3. Supprimer : console.log('render')
4. Ajouter : JSDoc sur handleClick()

❓ Confirmes-tu ces modifications ? (oui/non)
```

### Résumé final
```
🧹 Nettoyage terminé

📊 Statistiques :
- Fichiers analysés : 42
- Fichiers modifiés : 28
- Lignes supprimées : 387
- Imports nettoyés : 64
- Variables supprimées : 23
- Commentaires supprimés : 89
- Documentation ajoutée : 15

✅ Validation :
- Build : réussi
- Aucune régression détectée
- Prêt pour commit
```

---

## 💡 Règles de Décision

### En cas de doute
```
SI incertain sur la suppression d'un élément
ALORS → NE PAS SUPPRIMER et demander confirmation

SI un export semble inutilisé
ALORS → CONSERVER (peut être utilisé ailleurs)

SI un commentaire semble obsolète mais apporte du contexte
ALORS → CONSERVER

SI une fonction privée semble inutilisée mais complexe
ALORS → Demander confirmation avant suppression
```

### Cas particuliers
- **Types TypeScript** : Conserver même si usage indirect
- **Constantes de config** : Conserver tous les exports
- **Fonctions utilitaires** : Vérifier usage dans tout le projet
- **Interfaces** : Conserver si exportées
- **Enums** : Conserver si exportés

---

## 🎯 Objectif Final

### Avant nettoyage
```typescript
import { A, B, C, D } from 'lib'; // 4 imports
const UNUSED = 42;
const TEMP_DEBUG = 'test';
// TODO: fix this
console.log('test');

function helper() { } // jamais utilisé
export function main() {
  const x = A + B;
  return x;
}
```

### Après nettoyage
```typescript
import { A, B } from 'lib'; // seulement ceux utilisés

/**
 * Fonction principale de traitement
 * @returns Somme de A et B
 */
export function main() {
  const x = A + B;
  return x;
}
```

---

## 🚀 Commande de Démarrage

```
Windsurf, nettoie le code du projet en suivant strictement ce prompt.

Commence par le dossier : [src/utils/]

Analyse fichier par fichier, propose tes modifications, et attends ma confirmation avant d'appliquer.

Rappelle-toi : AUCUNE modification de logique, UNIQUEMENT suppression du superflu.
```

---

## ⚠️ Points d'Attention Critiques

### 🔴 DANGER - Ne jamais toucher
- **Authentification** (`auth/`, `session/`)
- **Paiements** (`payment/`, `checkout/`)
- **Base de données** (`db/`, `models/`, `schema/`)
- **API externes** (`api/`, `services/external/`)

### 🟡 PRUDENCE - Vérifier 2 fois
- **Hooks React** (effets de bord possibles)
- **Context providers** (état global)
- **Routes** (paramètres d'URL)
- **Middlewares** (chaîne de traitement)

### 🟢 SÛR - Nettoyer librement
- **Composants UI simples**
- **Utilitaires de formatage**
- **Constantes de style**
- **Helpers de validation**

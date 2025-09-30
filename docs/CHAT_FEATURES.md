# AlphaCodeIDE - Guide du Chat Vibe Coding

## 🎨 Interface Moderne

Le chat Vibe Coding d'AlphaCodeIDE offre une expérience similaire à **Cascade (Windsurf)** et **GitHub Copilot Chat** avec des fonctionnalités avancées.

---

## ✨ Fonctionnalités Principales

### 1. 💬 Chat Contextuel Intelligent

Le chat comprend automatiquement votre contexte de travail:
- **Fichier actif** - Analyse le fichier ouvert
- **Code sélectionné** - Utilise votre sélection comme contexte
- **Workspace** - Accède à l'index de votre projet

### 2. 📝 Rendu Markdown Complet

Les réponses de l'IA sont affichées avec un formatage riche:

- **Texte formaté** - Gras, italique, liens
- **Listes** - Puces et numérotées
- **Titres** - Hiérarchie claire
- **Code inline** - `variable`, `function()`
- **Blocs de code** - Avec langage et syntax highlighting

Exemple de réponse formatée:
````markdown
# Voici comment créer un serveur HTTP

Voici un exemple simple en **TypeScript**:

```typescript
import * as http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World!');
});

server.listen(3000);
```

Pour l'utiliser:
- Installer Node.js
- Exécuter `npm install`
- Lancer avec `node server.js`
````

### 3. 🎬 Boutons d'Action Interactifs

Chaque réponse de l'IA inclut des boutons d'action:

#### 📋 **Copy**
- Copie l'intégralité de la réponse
- Feedback visuel "Copied!"
- Accessible via clic

#### ✨ **Apply Code** (si code présent)
- Insère automatiquement le code dans l'éditeur
- Remplace la sélection actuelle
- Ou insère à la position du curseur
- Détecte automatiquement les blocs de code

#### 🔄 **Regenerate**
- Régénère la réponse avec le même prompt
- Utile si la réponse n'est pas satisfaisante
- Conserve le contexte

### 4. 💡 Suggestions Rapides

Accès rapide aux tâches courantes via boutons prédéfinis:

| Suggestion | Description |
|------------|-------------|
| 💡 **Explain this code** | Explique le code sélectionné |
| 🔧 **Refactor selection** | Propose des améliorations |
| 📝 **Add documentation** | Génère JSDoc/docstrings |
| 🐛 **Find bugs** | Détecte les problèmes potentiels |
| ✨ **Optimize performance** | Suggère des optimisations |
| 🧪 **Generate tests** | Crée des tests unitaires |

### 5. 📦 Blocs de Code Avancés

Les blocs de code incluent:

```typescript
// Exemple de bloc de code
function example() {
  console.log('Hello!');
}
```

Fonctionnalités:
- **Header avec langage** - Indique le langage (TypeScript, Python, etc.)
- **Bouton Copy intégré** - Copie uniquement le code
- **Syntax highlighting** - Coloration automatique
- **Scroll horizontal** - Pour code long
- **Style Monaco** - Police monospace

### 6. 🌊 Streaming en Temps Réel

L'IA affiche ses réponses progressivement:
- Mots affichés en temps réel
- Spinner de chargement élégant
- Scroll automatique vers le bas
- Expérience fluide et réactive

---

## 🎯 Cas d'Utilisation

### 1. Génération de Code

**Prompt:**
```
Create a React component for a todo list with add/remove functionality
```

**Résultat:**
- Code complet avec imports
- Bouton "Apply Code" pour insertion directe
- Documentation inline

### 2. Refactoring

1. Sélectionner le code à refactorer
2. Cliquer sur "🔧 Refactor selection"
3. L'IA propose des améliorations
4. Cliquer sur "Apply Code" pour appliquer

### 3. Debugging

**Prompt:**
```
Find bugs in my authentication function
```

L'IA:
- Analyse le code
- Identifie les problèmes
- Suggère des corrections
- Fournit le code corrigé

### 4. Documentation

**Prompt:**
```
Add JSDoc comments to this function
```

L'IA génère:
```typescript
/**
 * Calculates the sum of two numbers
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
function add(a: number, b: number): number {
  return a + b;
}
```

### 5. Tests Unitaires

**Prompt:**
```
Generate Jest tests for my calculator class
```

L'IA crée:
- Suite de tests complète
- Cas normaux et edge cases
- Mocking si nécessaire

---

## ⚙️ Configuration

### Providers Supportés

Le chat fonctionne avec tous les providers configurés:

**OpenAI (Recommandé pour qualité)**
```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.model": "gpt-4-turbo"
}
```

**Claude (Recommandé pour code)**
```json
{
  "alphacode.ai.provider": "anthropic",
  "alphacode.ai.model": "claude-3-5-sonnet-20241022"
}
```

**Ollama (Gratuit/Offline)**
```json
{
  "alphacode.ai.provider": "local",
  "alphacode.ai.model": "codellama"
}
```

### Options Chat

```json
{
  "alphacode.chat.streamResponses": true,  // Streaming temps réel
  "alphacode.chat.saveSessions": true,     // Sauvegarder l'historique
  "alphacode.context.indexWorkspace": true // Context awareness
}
```

---

## 🎮 Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Enter` ou `Cmd+Enter` | Envoyer le message |
| `Échap` | Annuler la saisie en cours |
| `Ctrl+L` | Effacer la conversation |

---

## 💡 Astuces Pro

### 1. Contexte Précis
Sélectionnez du code avant de poser une question pour un contexte précis:
```
[Sélectionner fonction] → "Explain this function"
```

### 2. Prompts Structurés
Utilisez des prompts clairs:
```
✅ "Create a TypeScript function that validates email addresses with regex"
❌ "make email thing"
```

### 3. Itération
Utilisez "Regenerate" si la première réponse n'est pas parfaite:
```
Prompt → Réponse → Regenerate → Meilleure réponse
```

### 4. Code Multi-Fichiers
Pour du code sur plusieurs fichiers, demandez:
```
"Create a REST API with:
- Express server (server.ts)
- User routes (routes/users.ts)
- User model (models/User.ts)"
```

### 5. Spécifications Détaillées
Plus vous êtes précis, meilleure est la réponse:
```
"Create a React component with:
- TypeScript
- Tailwind CSS for styling
- useState for state management
- Props interface exported"
```

---

## 🔍 Comparaison avec Autres IDEs

| Fonctionnalité | AlphaCode | Cascade (Windsurf) | Copilot Chat |
|----------------|-----------|-------------------|--------------|
| Markdown Rendering | ✅ | ✅ | ✅ |
| Code Blocks avec Copy | ✅ | ✅ | ✅ |
| Apply Code Button | ✅ | ✅ | ❌ |
| Quick Suggestions | ✅ | ❌ | ❌ |
| Regenerate | ✅ | ✅ | ❌ |
| Streaming | ✅ | ✅ | ✅ |
| Multi-Provider | ✅ (4) | ❌ (1) | ❌ (1) |
| Offline Support | ✅ | ❌ | ❌ |
| Gratuit (Ollama) | ✅ | ❌ | ❌ |

---

## 🐛 Dépannage

### Le chat ne répond pas
1. Vérifier la configuration AI dans Settings
2. Vérifier la clé API
3. Vérifier la connexion internet (sauf Ollama)

### Erreur "Provider not configured"
```bash
# Ouvrir Settings (Ctrl+,)
# Chercher "alphacode"
# Configurer provider et API key
```

### Streaming ne fonctionne pas
```json
{
  "alphacode.chat.streamResponses": true
}
```

### Code non appliqué
- Assurez-vous qu'un fichier est ouvert dans l'éditeur
- Le curseur doit être dans un éditeur de code
- Certains types de fichiers ne supportent pas l'édition

---

## 🚀 Prochaines Fonctionnalités

### v2.1 (Planifié)
- [ ] **Voice Input** - Commande vocale
- [ ] **Multi-turn Context** - Contexte sur plusieurs messages
- [ ] **File Attachments** - Joindre des fichiers
- [ ] **Diff View** - Prévisualisation des changements
- [ ] **Templates** - Templates de prompts personnalisés
- [ ] **History Search** - Recherche dans l'historique
- [ ] **Export Chat** - Exporter en Markdown

### v2.2 (Futur)
- [ ] **Collaborative Chat** - Chat d'équipe
- [ ] **Custom Agents** - Créer vos agents
- [ ] **Plugins Marketplace** - Extensions de chat
- [ ] **Analytics** - Statistiques d'utilisation

---

## 📚 Ressources

- **Documentation:** `ALPHACODE_README.md`
- **Exemples:** `docs/EXAMPLES.md`
- **Développement:** `docs/DEVELOPMENT.md`
- **Changelog:** `ALPHACODE_CHANGELOG.md`

---

## 🎉 Conclusion

Le chat Vibe Coding d'AlphaCodeIDE offre une expérience moderne et complète pour le développement assisté par IA, avec des fonctionnalités avancées qui rivalisent avec les meilleurs outils du marché.

**Commencez à coder avec l'IA dès maintenant! 🚀**

---

**Version:** 2.1.0  
**Dernière mise à jour:** 2025-09-30  
**Auteur:** AlphaCode Team

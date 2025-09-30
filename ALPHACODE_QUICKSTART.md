# AlphaCodeIDE - Guide de Démarrage Rapide

## 🚀 Installation & Configuration (5 minutes)

### Étape 1: Build du projet

```bash
# Dans le répertoire AlphaCode
npm install
npm run watch  # ou npm run compile
```

### Étape 2: Lancer l'IDE

```bash
# Lancer depuis VS Code en mode développement
# Ou utiliser:
./scripts/code.sh  # Linux/Mac
./scripts/code.bat # Windows
```

### Étape 3: Configuration Rapide

1. **Ouvrir Settings**
   - Appuyer sur `Ctrl+,` (Windows/Linux) ou `Cmd+,` (Mac)
   - Chercher "alphacode"

2. **Configurer OpenAI** (option la plus simple):
   ```json
   {
     "alphacode.ai.provider": "openai",
     "alphacode.ai.apiKey": "sk-votre-clé-ici",
     "alphacode.ai.model": "gpt-4"
   }
   ```

3. **Ou configurer Claude** (recommandé):
   ```json
   {
     "alphacode.ai.provider": "anthropic",
     "alphacode.ai.apiKey": "sk-ant-votre-clé-ici",
     "alphacode.ai.model": "claude-3-5-sonnet-20241022"
   }
   ```

### Étape 4: Ouvrir le Panel Vibe Coding

1. Cliquer sur l'icône 🤖 dans la sidebar gauche
2. Ou appuyer sur `F1` et taper "AlphaCode"
3. Le panel de chat s'affiche si la configuration est correcte

## 💡 Premiers Pas

### Exemple 1: Chat Simple

```
Vous: Comment créer un serveur Express en TypeScript ?

AI: [Génère le code complet avec explications]
```

### Exemple 2: Refactoriser du Code

1. Sélectionner du code dans l'éditeur
2. `F1` → "AlphaCode: Refactor Selected Code"
3. La refactorisation s'affiche dans le panel

### Exemple 3: Expliquer du Code

1. Sélectionner du code complexe
2. `F1` → "AlphaCode: Explain Selected Code"
3. Explication détaillée dans le panel

### Exemple 4: Générer Documentation

1. Sélectionner une fonction
2. `F1` → "AlphaCode: Generate Documentation"
3. Documentation JSDoc/DocString générée

## 🎯 Cas d'Usage Pratiques

### 1. Créer un Composant React

**Dans le chat:**
```
Crée un composant React TypeScript pour un formulaire de login avec validation
```

**Résultat:** Code complet avec useState, validation, et styles

### 2. Debug un Problème

**Dans le chat avec code sélectionné:**
```
Ce code génère une erreur "Cannot read property of undefined". Peux-tu identifier le problème ?
```

**Résultat:** Analyse + correction + explication

### 3. Améliorer les Performances

**Sélectionner une fonction lente puis:**
```
F1 → AlphaCode: Refactor Selected Code
```

**Dans le chat:** "Optimise cette fonction pour de meilleures performances"

### 4. Écrire des Tests

**Dans le chat:**
```
Génère des tests Jest pour cette fonction: [sélectionner la fonction]
```

**Résultat:** Suite de tests complète

## ⚙️ Configuration Avancée

### Optimiser pour votre Usage

```json
{
  // Plus créatif (0.0 = déterministe, 2.0 = très créatif)
  "alphacode.ai.temperature": 0.9,
  
  // Réponses plus longues
  "alphacode.ai.maxTokens": 4096,
  
  // Indexer plus de fichiers
  "alphacode.context.maxFiles": 200,
  
  // Désactiver le streaming si connexion lente
  "alphacode.chat.streamResponses": false
}
```

### Providers Alternatifs

#### Azure OpenAI
```json
{
  "alphacode.ai.provider": "azure",
  "alphacode.ai.apiKey": "votre-clé-azure",
  "alphacode.ai.endpoint": "https://your-resource.openai.azure.com/",
  "alphacode.ai.model": "gpt-4"
}
```

#### Local (Ollama, LM Studio, etc.)
```json
{
  "alphacode.ai.provider": "local",
  "alphacode.ai.endpoint": "http://localhost:11434/api/chat",
  "alphacode.ai.model": "codellama"
}
```

## 🔥 Astuces Pro

### 1. Utiliser le Contexte

Le chat inclut automatiquement:
- ✅ Fichier actif
- ✅ Code sélectionné
- ✅ Fichiers ouverts

**Astuce:** Sélectionner du code avant de poser une question pour un contexte précis.

### 2. Commandes Rapides

**Raccourcis utiles:**
- `Ctrl+Enter` dans le chat: Envoyer le message
- `F1 → AlphaCode`: Voir toutes les commandes
- Clic droit dans l'éditeur: Menu contextuel (à venir)

### 3. Sessions de Chat

- Chaque workspace a ses propres sessions
- L'historique est sauvegardé automatiquement
- Bouton "Clear" pour recommencer

### 4. Indexation Workspace

```
F1 → AlphaCode: Index Workspace
```

Permet à l'IA de:
- Connaître la structure du projet
- Suggérer du code cohérent
- Référencer d'autres fichiers

## 🛠️ Résolution de Problèmes

### Erreur "No AI provider configured"

**Solution:**
1. Vérifier que `alphacode.ai.apiKey` est défini
2. Vérifier que `alphacode.ai.provider` est valide
3. Redémarrer AlphaCodeIDE

### L'IA ne répond pas

**Vérifications:**
1. Ouvrir DevTools: `Help → Toggle Developer Tools`
2. Regarder la Console pour les erreurs
3. Vérifier la clé API
4. Tester la connexion internet

### Chat vide après configuration

**Solution:**
1. Fermer et rouvrir le panel AlphaCode
2. Ou recharger la fenêtre: `Ctrl+R`

### Workspace non indexé

**Solution:**
```
F1 → AlphaCode: Index Workspace
```
Attendre la notification "Workspace indexed successfully"

## 📚 Exemples de Prompts

### Génération de Code

```
✅ Crée une API REST avec Express et TypeScript pour gérer des utilisateurs
✅ Implémente un système d'authentification JWT
✅ Génère un hook React custom pour fetch des données avec cache
```

### Refactoring

```
✅ Convertis ce code en TypeScript avec types stricts
✅ Sépare cette fonction en fonctions plus petites et testables
✅ Applique les design patterns appropriés à ce code
```

### Debug

```
✅ Pourquoi cette fonction retourne undefined ?
✅ Optimise les performances de ce composant React
✅ Identifie les memory leaks potentiels
```

### Documentation

```
✅ Ajoute JSDoc complet à ces fonctions
✅ Génère un README pour ce module
✅ Crée des exemples d'utilisation
```

## 🎓 Bonnes Pratiques

### 1. Soyez Précis

❌ "Fais un composant"
✅ "Crée un composant React TypeScript pour un modal réutilisable avec animations"

### 2. Fournissez du Contexte

❌ "Optimise ça"
✅ [Sélectionner le code] "Optimise cette fonction, elle traite 10000 éléments par seconde"

### 3. Itérez

```
Vous: Crée une fonction de tri
AI: [Code basique]
Vous: Ajoute support pour tri customisé
AI: [Code amélioré]
Vous: Ajoute des tests
AI: [Code + tests]
```

### 4. Utilisez les Agents Spécialisés

- **Génération**: Nouveau code from scratch
- **Refactor**: Améliorer code existant
- **Debug**: Résoudre problèmes
- **Documentation**: Documenter code
- **Explain**: Comprendre code

## 🚀 Workflow Recommandé

### Développement d'une Feature

1. **Planification**
   ```
   Chat: "Je veux implémenter [feature]. Quelles sont les étapes ?"
   ```

2. **Génération**
   ```
   Chat: "Génère le code pour [composant 1]"
   ```

3. **Refactoring**
   ```
   Sélectionner code → F1 → Refactor
   ```

4. **Tests**
   ```
   Chat: "Génère des tests pour ce code"
   ```

5. **Documentation**
   ```
   Sélectionner code → F1 → Generate Documentation
   ```

6. **Commit**
   ```
   Chat: "Génère un message de commit pour ces changements"
   ```

## 🔮 Prochaines Étapes

Une fois à l'aise:
1. Explorez les settings avancés
2. Testez différents providers
3. Ajustez température et max tokens
4. Configurez l'indexation pour grands projets
5. Intégrez dans votre workflow quotidien

---

**Prêt à coder avec l'IA ?** 🎉

Ouvrez AlphaCodeIDE et commencez à "vibe coder" !

# AlphaCodeIDE - Changelog

## [Version 2.0.0] - 2025-09-30

### 🎉 Nouvelles Fonctionnalités Majeures

#### Providers IA Additionnels
- **Azure OpenAI Provider** - Support complet d'Azure OpenAI avec authentification par clé API
  - Configuration de l'endpoint personnalisé
  - Support des deployments Azure
  - Version API 2024-02-15-preview
  
- **Local Provider** - Support des LLMs locaux
  - Compatible avec Ollama
  - Compatible avec LM Studio
  - Compatible avec LocalAI
  - Support OpenAI-compatible API
  - Pas de clé API requise pour les serveurs locaux

#### Streaming Visuel en Temps Réel
- **Streaming dans le Chat** - Les réponses de l'IA s'affichent progressivement
  - Indicateur de frappe (typing indicator)
  - Mise à jour en temps réel du contenu
  - Scroll automatique pendant le streaming
  - Meilleure expérience utilisateur

#### Mode Pair Programming
- **Service de Pair Programming** - Collaboration temps réel avec l'IA
  - Suivi du contexte du curseur
  - Suggestions intelligentes contextuelles
  - 4 modes de fonctionnement:
    * **Off** - Désactivé
    * **Suggestive** - Affiche les suggestions sans auto-appliquer
    * **Active** - Applique automatiquement les suggestions haute confiance
    * **Live** - Collaboration en temps réel
  - Configuration du délai de suggestion
  - Seuil de confiance configurable
  - Support des suggestions inline et refactoring

#### Sécurité Renforcée
- **Service de Sécurité** - Détection et masquage automatique des secrets
  - Détection de 12+ types de secrets:
    * Clés API (OpenAI, Anthropic, AWS, GitHub, Google, Slack)
    * Tokens JWT
    * Clés privées RSA/EC
    * Mots de passe dans URLs
    * Chaînes de connexion bases de données
  - Masquage automatique avant envoi à l'IA
  - Patterns personnalisables
  - Configuration de sécurité flexible
  - Warnings optionnels sur détection

### ✨ Améliorations

#### Chat Service
- Intégration du service de sécurité
- Masquage automatique des secrets dans le code sélectionné
- Masquage automatique dans les messages utilisateur
- Événements de streaming pour mise à jour UI
- Génération d'IDs uniques pour les messages streaming

#### Interface Utilisateur
- Amélioration de l'affichage des messages
- Animation du spinner de chargement
- Meilleure gestion des erreurs visuelles
- Suppression automatique du spinner au début du streaming
- Messages utilisateur affichés immédiatement

#### Architecture
- Séparation claire des responsabilités
- Services enregistrés comme singletons
- Support de l'injection de dépendances
- Code typé avec TypeScript strict
- Documentation inline complète

### 📚 Documentation

#### Nouveaux Documents
- **DEVELOPMENT.md** - Guide complet de développement
  - Architecture détaillée des services
  - Instructions de build et compilation
  - Exemples d'extension du système
  - Conventions de code
  - Debugging et tests
  
- **EXAMPLES.md** - Exemples d'utilisation pratiques
  - Configuration de tous les providers
  - Exemples de prompts efficaces
  - Cas d'usage réels
  - Exemples de code généré
  - Astuces pro

- **CHANGELOG.md** - Ce fichier!

### 🔧 Configuration

#### Nouvelles Options
```json
{
  // Nouveau: Support Azure
  "alphacode.ai.provider": "azure",
  "alphacode.ai.endpoint": "https://your-resource.openai.azure.com/",
  
  // Nouveau: Support Local
  "alphacode.ai.provider": "local",
  "alphacode.ai.endpoint": "http://localhost:11434/v1/chat/completions",
  
  // Nouveau: Sécurité
  "alphacode.security.maskSecrets": true,
  "alphacode.security.warnOnSecretDetection": true,
  
  // Nouveau: Pair Programming
  "alphacode.pairProgramming.mode": "suggestive",
  "alphacode.pairProgramming.suggestionDelay": 1000,
  "alphacode.pairProgramming.minConfidenceThreshold": 0.7,
  "alphacode.pairProgramming.enableInlineCompletions": true
}
```

### 🐛 Corrections de Bugs
- Fix: Messages utilisateur n'avaient pas d'ID unique
- Fix: Spinner de chargement ne disparaissait pas pendant le streaming
- Fix: Types Range incorrects dans les suggestions de pair programming
- Fix: Import manquant pour generateUuid dans vibeCodingView

### 🔄 Changements Internes

#### Nouveaux Fichiers
```
src/vs/workbench/contrib/alphacode/
├── browser/
│   ├── providers/
│   │   ├── azureProvider.ts (NOUVEAU)
│   │   └── localProvider.ts (NOUVEAU)
│   ├── pairProgrammingServiceImpl.ts (NOUVEAU)
│   └── securityServiceImpl.ts (NOUVEAU)
└── common/
    ├── pairProgramming.ts (NOUVEAU)
    └── securityService.ts (NOUVEAU)

docs/
├── DEVELOPMENT.md (NOUVEAU)
├── EXAMPLES.md (NOUVEAU)
└── CHANGELOG.md (NOUVEAU)
```

#### Services Enregistrés
- `IAlphaCodePairProgrammingService` → `AlphaCodePairProgrammingService`
- `IAlphaCodeSecurityService` → `AlphaCodeSecurityService`

### 📊 Statistiques

- **12 nouveaux fichiers** créés
- **6 fichiers existants** améliorés
- **4 nouveaux services** implémentés
- **2 nouveaux providers** IA ajoutés
- **3 nouveaux documents** de documentation

### 🚀 Migration

#### De Version 1.x à 2.0

**Aucune action requise!** Toutes les nouvelles fonctionnalités sont rétrocompatibles.

Pour profiter des nouvelles fonctionnalités:

1. **Azure OpenAI:**
   ```json
   {
     "alphacode.ai.provider": "azure",
     "alphacode.ai.endpoint": "https://your-resource.openai.azure.com/",
     "alphacode.ai.apiKey": "your-key"
   }
   ```

2. **Local LLM (Ollama):**
   ```bash
   # Installer Ollama
   ollama pull codellama
   
   # Configurer AlphaCode
   {
     "alphacode.ai.provider": "local",
     "alphacode.ai.endpoint": "http://localhost:11434/v1/chat/completions",
     "alphacode.ai.model": "codellama"
   }
   ```

3. **Activer le Pair Programming:**
   ```json
   {
     "alphacode.pairProgramming.mode": "suggestive"
   }
   ```

4. **Sécurité activée par défaut** - Aucune configuration nécessaire

### 🎯 Roadmap pour Version 2.1

#### Fonctionnalités Prévues
- [ ] Interface visuelle pour les suggestions de pair programming
- [ ] Historique multi-sessions avec recherche
- [ ] Export/Import de conversations
- [ ] Templates de prompts personnalisables
- [ ] Intégration Git pour commit messages intelligents
- [ ] Support des embeddings pour recherche sémantique
- [ ] Mode "Zen" avec personnalisation d'ambiance
- [ ] Marketplace d'agents personnalisés
- [ ] Internationalisation (i18n)
- [ ] Analytics d'utilisation (local uniquement)

#### Améliorations Prévues
- [ ] Amélioration de la détection de secrets (plus de patterns)
- [ ] Cache intelligent des contextes fréquents
- [ ] Optimisation des performances d'indexation
- [ ] Support de plus de langages de programmation
- [ ] Meilleure gestion des gros fichiers
- [ ] Preview des suggestions avant application
- [ ] Raccourcis clavier personnalisables pour les agents

### 🤝 Contributions

Les contributions sont les bienvenues! Voici comment vous pouvez aider:

1. **Nouveaux Providers IA**
   - Implémenter `IAIProvider`
   - Ajouter dans `aiServiceImpl.ts`
   - Documenter la configuration

2. **Nouveaux Agents**
   - Ajouter le type dans `agents.ts`
   - Implémenter dans `agentServiceImpl.ts`
   - Créer le prompt système
   - Ajouter une action dans `alphacodeActions.ts`

3. **Patterns de Sécurité**
   - Ajouter dans `securityServiceImpl.ts`
   - Tester la détection
   - Documenter le pattern

4. **Documentation**
   - Exemples d'utilisation
   - Tutoriels
   - Traductions

### 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/alphacode/issues)
- **Documentation:** Voir `ALPHACODE_README.md`
- **Développement:** Voir `docs/DEVELOPMENT.md`
- **Exemples:** Voir `docs/EXAMPLES.md`

### 📄 Licence

MIT License - Basé sur VS Code (Microsoft)

---

## [Version 1.0.0] - 2025-09-29

### Fonctionnalités Initiales
- Support OpenAI et Anthropic
- Interface Chat "Vibe Coding"
- Agents IA spécialisés (génération, refactor, debug, doc)
- Indexation workspace
- Sessions de chat persistantes
- Configuration flexible

---

**AlphaCodeIDE** - Code with Vibe, Build with AI 🚀

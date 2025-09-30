# AlphaCodeIDE - AI-Powered Vibe Coding

AlphaCodeIDE est un IDE desktop basé sur VS Code avec des agents IA intégrés pour le "vibe coding". Il permet aux développeurs de collaborer avec l'IA directement dans leur environnement de développement, sans backend intermédiaire.

## 🎯 Fonctionnalités Implémentées

### 1. Infrastructure IA
- **Multi-providers**: Support OpenAI, Anthropic (Claude), Azure OpenAI, et providers locaux
- **Gestion sécurisée des clés API**: Stockage local chiffré via le système de storage VS Code
- **Streaming de réponses**: Réponses IA en temps réel avec support du streaming
- **Configuration flexible**: Température, max tokens, modèles personnalisables

### 2. Interface Chat "Vibe Coding"
- **Panel dockable**: Interface chat intégrée dans la sidebar
- **Contexte intelligent**: Détection automatique du fichier actif et code sélectionné
- **Sessions persistantes**: Sauvegarde automatique des conversations
- **Interface moderne**: Design responsive avec animations fluides

### 3. Agents IA Spécialisés
- **Code Generation**: Génération de code à partir de descriptions
- **Refactor**: Amélioration et restructuration de code
- **Debug**: Identification et correction d'erreurs
- **Documentation**: Génération automatique de documentation
- **Explain**: Explication de code en langage clair
- **Commit Messages**: Génération de messages de commit conventionnels

### 4. Indexation Workspace
- **Indexation intelligente**: Parsing automatique des fichiers code
- **Recherche de symboles**: Recherche rapide de fonctions, classes, types
- **Contexte enrichi**: Fourniture de contexte pertinent aux agents IA
- **Support multi-langages**: TypeScript, JavaScript, Python, Java, C++, etc.

## 📦 Architecture

### Structure des Fichiers

```
src/vs/workbench/contrib/alphacode/
├── common/
│   ├── alphacode.ts              # Constantes et IDs
│   ├── aiProvider.ts             # Interfaces AI providers
│   ├── aiService.ts              # Service IA principal
│   ├── chatService.ts            # Service de chat
│   ├── contextService.ts         # Service d'indexation
│   ├── agents.ts                 # Services agents IA
│   └── configuration.ts          # Configuration settings
├── browser/
│   ├── alphacode.contribution.ts # Enregistrement extensions
│   ├── alphacodeViewlet.ts       # Container viewlet
│   ├── vibeCodingView.ts         # Vue principale chat
│   ├── aiServiceImpl.ts          # Implémentation service IA
│   ├── chatServiceImpl.ts        # Implémentation chat
│   ├── contextServiceImpl.ts     # Implémentation indexation
│   ├── agentServiceImpl.ts       # Implémentation agents
│   ├── alphacodeActions.ts       # Commandes/actions
│   ├── providers/
│   │   ├── openaiProvider.ts    # Provider OpenAI
│   │   └── anthropicProvider.ts # Provider Anthropic
│   └── media/
│       ├── vibeCodingView.css   # Styles welcome
│       └── chatView.css         # Styles chat
```

### Services Principaux

#### 1. IAlphaCodeAIService
Service de communication avec les providers IA.

**Méthodes**:
- `sendMessage(messages, options)`: Envoi de messages avec réponse complète
- `sendMessageStream(messages, onChunk, options)`: Streaming de réponses
- `getProviderConfig()`: Récupération de la configuration
- `updateProviderConfig(config)`: Mise à jour configuration
- `testConnection()`: Test de connexion au provider

#### 2. IAlphaCodeChatService
Gestion des sessions de chat et historique.

**Méthodes**:
- `sendMessage(content, context)`: Envoi message avec contexte
- `getCurrentSession()`: Session active
- `createSession(title)`: Nouvelle session
- `getSessions()`: Liste toutes les sessions
- `clearCurrentSession()`: Effacer la session
- `exportSession(id)`: Export JSON

#### 3. IAlphaCodeContextService
Indexation et recherche dans le workspace.

**Méthodes**:
- `indexWorkspace()`: Indexer le workspace
- `getWorkspaceContext()`: Contexte complet workspace
- `getFileContext(uri)`: Contexte d'un fichier
- `searchSymbols(query)`: Recherche de symboles
- `getRelevantContext(query, maxFiles)`: Contexte pertinent

#### 4. IAlphaCodeAgentService
Agents IA spécialisés pour tâches spécifiques.

**Méthodes**:
- `generateCode(description, language, context)`
- `refactorCode(code, instruction, language)`
- `debugCode(code, error, language)`
- `generateDocumentation(code, language)`
- `generateCommitMessage(diff)`
- `explainCode(code, language)`

## 🚀 Configuration

### 1. Configuration AI Provider

Ouvrir les settings (Ctrl+,) et chercher "alphacode":

```json
{
  // Provider IA
  "alphacode.ai.provider": "openai",  // ou "anthropic", "azure", "local"
  
  // Clé API (stockée de manière sécurisée)
  "alphacode.ai.apiKey": "sk-...",
  
  // Endpoint personnalisé (optionnel)
  "alphacode.ai.endpoint": "",
  
  // Modèle à utiliser
  "alphacode.ai.model": "gpt-4",  // ou "claude-3-5-sonnet-20241022"
  
  // Paramètres de génération
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7,
  
  // Indexation workspace
  "alphacode.context.indexWorkspace": true,
  "alphacode.context.maxFiles": 100,
  
  // Chat
  "alphacode.chat.streamResponses": true,
  "alphacode.chat.saveSessions": true,
  
  // Sécurité
  "alphacode.security.maskSecrets": true
}
```

### 2. Providers Supportés

#### OpenAI
```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-...",
  "alphacode.ai.model": "gpt-4"
}
```

#### Anthropic Claude
```json
{
  "alphacode.ai.provider": "anthropic",
  "alphacode.ai.apiKey": "sk-ant-...",
  "alphacode.ai.model": "claude-3-5-sonnet-20241022"
}
```

#### Azure OpenAI
```json
{
  "alphacode.ai.provider": "azure",
  "alphacode.ai.apiKey": "...",
  "alphacode.ai.endpoint": "https://your-resource.openai.azure.com/",
  "alphacode.ai.model": "gpt-4"
}
```

## 🎮 Utilisation

### 1. Ouvrir le Panel Vibe Coding

1. Cliquer sur l'icône AlphaCode dans la sidebar (🤖)
2. Ou utiliser la palette de commandes: `View: Show AlphaCode`

### 2. Premier Usage

1. Configurer votre provider IA dans les settings
2. Ajouter votre clé API
3. Le panel affiche l'interface de chat une fois configuré

### 3. Chat avec l'IA

1. Taper votre question dans la zone de texte
2. Appuyer sur "Send" ou Ctrl+Enter
3. L'IA répond avec le contexte de votre workspace actif
4. Les réponses incluent automatiquement le contexte du fichier actif

### 4. Commandes Disponibles

#### Via Palette de Commandes (F1)

- **AlphaCode: Generate Code** - Générer du code
- **AlphaCode: Refactor Selected Code** - Refactoriser la sélection
- **AlphaCode: Explain Selected Code** - Expliquer le code
- **AlphaCode: Generate Documentation** - Générer la documentation
- **AlphaCode: Index Workspace** - Indexer le workspace

#### Via Sélection de Code

1. Sélectionner du code dans l'éditeur
2. Utiliser les commandes pour refactor, expliquer, ou documenter
3. Les résultats apparaissent dans le panel Vibe Coding

### 5. Gestion des Sessions

- **Nouvelle session**: Les sessions sont automatiquement créées
- **Effacer session**: Bouton "Clear" dans la toolbar
- **Sessions multiples**: Support des sessions persistantes (à venir)

## 🔧 Développement

### Ajouter un Nouveau Provider

1. Créer une classe implémentant `IAIProvider`:

```typescript
export class CustomProvider implements IAIProvider {
  constructor(private config: IAIProviderConfig) {}
  
  async sendMessage(messages: IAIMessage[]): Promise<IAIResponse> {
    // Implémentation
  }
  
  async sendMessageStream(messages: IAIMessage[], onChunk): Promise<void> {
    // Implémentation streaming
  }
}
```

2. Ajouter dans `aiServiceImpl.ts`:

```typescript
case AIProviderType.Custom:
  this.currentProvider = new CustomProvider(this.currentConfig);
  break;
```

### Ajouter un Nouvel Agent

1. Ajouter le type dans `agents.ts`:

```typescript
export enum AgentType {
  // ...
  CustomAgent = 'customAgent'
}
```

2. Implémenter dans `agentServiceImpl.ts`:

```typescript
async customAgent(input: string): Promise<IAgentResponse> {
  return this.executeAgent({
    type: AgentType.CustomAgent,
    instruction: input
  });
}
```

3. Ajouter le prompt système:

```typescript
const systemPrompts: { [key in AgentType]: string } = {
  // ...
  [AgentType.CustomAgent]: 'Your custom system prompt'
};
```

## 🔒 Sécurité

### Stockage des Clés API

Les clés API sont stockées de manière sécurisée via:
- `IStorageService` avec `StorageScope.APPLICATION`
- `StorageTarget.MACHINE` pour stockage local chiffré
- Jamais exposées dans les logs ou UI

### Masquage des Secrets

Fonctionnalité de masquage automatique des secrets dans les prompts:
- Patterns regex pour détecter clés API, tokens, passwords
- Configurable via `alphacode.security.maskSecrets`

### Données Locales

- **Aucun backend**: Toutes les données restent locales
- **Requêtes directes**: Communication directe avec providers IA
- **Historique local**: Sessions sauvegardées localement uniquement

## 📊 Performances

### Optimisations Implémentées

- **Indexation incrémentale**: Seuls les nouveaux fichiers sont indexés
- **Lazy loading**: Services chargés à la demande
- **Streaming**: Réponses progressives pour meilleure UX
- **Cache**: Mise en cache des contextes de fichiers

### Limites

- **Fichiers indexés**: Configuré via `alphacode.context.maxFiles` (défaut: 100)
- **Taille fichiers**: Fichiers > 1MB ignorés par défaut
- **Tokens**: Limite configurable via `alphacode.ai.maxTokens`

## 🐛 Dépannage

### L'IA ne répond pas

1. Vérifier la clé API dans les settings
2. Tester la connexion: Commande "AlphaCode: Test Connection"
3. Vérifier la console développeur (Help > Toggle Developer Tools)

### Erreur "No provider configured"

1. Ouvrir Settings (Ctrl+,)
2. Chercher "alphacode.ai.provider"
3. Sélectionner un provider et configurer la clé API

### Workspace non indexé

1. Exécuter: "AlphaCode: Index Workspace"
2. Vérifier `alphacode.context.indexWorkspace` = true
3. Attendre la fin de l'indexation

## 🗺️ Roadmap

### Phase 2 (À venir)
- [ ] Streaming visuel dans le chat
- [ ] Support Azure et providers locaux
- [ ] Gestion multi-sessions avec historique
- [ ] Intégration Git pour commit messages
- [ ] Mode pair programming live
- [ ] Indexation avancée avec tree-sitter

### Phase 3
- [ ] Marketplace d'agents personnalisés
- [ ] Templates de prompts
- [ ] Analyse sémantique avancée
- [ ] Support embeddings pour recherche
- [ ] Mode "zen" avec ambiance
- [ ] Internationalisation

## 📄 Licence

Ce projet est basé sur VS Code (Microsoft) sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues! Pour contribuer:

1. Fork le repository
2. Créer une branche feature
3. Implémenter les changements
4. Tester localement
5. Soumettre une Pull Request

## 📞 Support

Pour questions et support:
- Issues GitHub: [Créer une issue]
- Documentation: Ce fichier README
- VS Code API: [VS Code Extension API](https://code.visualstudio.com/api)

---

**AlphaCodeIDE** - Code with Vibe, Build with AI 🚀

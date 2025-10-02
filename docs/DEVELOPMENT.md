# AlphaCodeIDE - Guide de Développement

## 📁 Structure du Projet

```
AlphaCode/
├── src/vs/workbench/contrib/alphacode/    # Module principal AlphaCode
│   ├── common/                            # Interfaces et types
│   │   ├── aiProvider.ts                  # Types pour les providers IA
│   │   ├── aiService.ts                   # Interface du service IA
│   │   ├── chatService.ts                 # Interface du service chat
│   │   ├── contextService.ts              # Interface d'indexation
│   │   ├── agents.ts                      # Types pour les agents
│   │   ├── pairProgramming.ts             # Interface pair programming
│   │   ├── securityService.ts             # Interface de sécurité
│   │   └── configuration.ts               # Configuration settings
│   │
│   └── browser/                           # Implémentations
│       ├── aiServiceImpl.ts               # Service IA principal
│       ├── chatServiceImpl.ts             # Service de chat
│       ├── contextServiceImpl.ts          # Service d'indexation
│       ├── agentServiceImpl.ts            # Service des agents
│       ├── pairProgrammingServiceImpl.ts  # Service pair programming
│       ├── securityServiceImpl.ts         # Service de sécurité
│       ├── vibeCodingView.ts              # Vue principale chat
│       ├── alphacodeActions.ts            # Commandes
│       ├── alphacode.contribution.ts      # Enregistrement
│       ├── providers/
│       │   ├── openaiProvider.ts          # Provider OpenAI
│       │   ├── anthropicProvider.ts       # Provider Anthropic
│       │   ├── azureProvider.ts           # Provider Azure
│       │   └── localProvider.ts           # Provider Local (Ollama, LM Studio)
│       └── media/
│           ├── vibeCodingView.css         # Styles welcome
│           └── chatView.css               # Styles chat
```

## 🛠️ Compilation et Build

### Prérequis
- Node.js >= 18
- npm >= 8

### Installation
```bash
npm install
```

### Modes de Build

#### Mode Watch (Développement)
```bash
npm run watch
```
- Recompile automatiquement les changements
- Idéal pour le développement itératif

#### Compilation Simple
```bash
npm run compile
```
- Compile une fois sans watch

#### Lancement de l'IDE
```bash
# Windows
.\scripts\code.bat

# Linux/Mac
./scripts/code.sh
```

## 🏗️ Architecture des Services

### 1. AI Service (`aiServiceImpl.ts`)

**Responsabilités:**
- Gestion des providers IA (OpenAI, Anthropic, Azure, Local)
- Configuration et stockage sécurisé des clés API
- Envoi de messages et streaming

**Dépendances:**
- `IStorageService` - Stockage sécurisé des configurations
- Providers (OpenAI, Anthropic, Azure, Local)

**Points clés:**
- Les clés API sont stockées avec `StorageScope.APPLICATION` et `StorageTarget.MACHINE`
- Support du streaming pour toutes les providers
- Initialisation lazy des providers selon la configuration

### 2. Chat Service (`chatServiceImpl.ts`)

**Responsabilités:**
- Gestion des sessions de chat
- Historique des conversations
- Intégration avec AI Service pour les réponses

**Dépendances:**
- `IAlphaCodeAIService` - Envoi de messages à l'IA
- `IStorageService` - Persistance des sessions
- `IAlphaCodeSecurityService` - Masquage des secrets

**Points clés:**
- Sessions persistantes dans le workspace
- Limite de 10 messages dans le contexte pour optimiser les tokens
- Événements pour streaming en temps réel
- Masquage automatique des secrets avant envoi à l'IA

### 3. Context Service (`contextServiceImpl.ts`)

**Responsabilités:**
- Indexation du workspace
- Recherche de symboles
- Fourniture de contexte aux agents IA

**Dépendances:**
- `IWorkspaceContextService` - Accès au workspace
- `IFileService` - Lecture de fichiers

**Points clés:**
- Indexation incrémentale
- Support multi-langages (TypeScript, JavaScript, Python, etc.)
- Cache des fichiers indexés

### 4. Agent Service (`agentServiceImpl.ts`)

**Responsabilités:**
- Agents spécialisés (génération, refactor, debug, doc)
- Templates de prompts pour chaque agent
- Exécution optimisée des tâches

**Agents disponibles:**
- **Code Generation** - Génération de code from scratch
- **Refactor** - Amélioration de code existant
- **Debug** - Identification et correction d'erreurs
- **Documentation** - Génération JSDoc/DocString
- **Explain** - Explication de code en langage clair
- **Commit Messages** - Messages de commit conventionnels

### 5. Pair Programming Service (`pairProgrammingServiceImpl.ts`)

**Responsabilités:**
- Suivi du curseur en temps réel
- Suggestions contextuelles
- Auto-complétion intelligente

**Modes:**
- **Off** - Désactivé
- **Suggestive** - Affiche suggestions sans appliquer
- **Active** - Applique suggestions haute confiance
- **Live** - Collaboration temps réel avec IA

### 6. Security Service (`securityServiceImpl.ts`)

**Responsabilités:**
- Détection et masquage de secrets
- Patterns de détection (API keys, tokens, passwords)
- Configuration de sécurité

**Patterns détectés:**
- Clés API (OpenAI, Anthropic, AWS, GitHub, etc.)
- Tokens JWT
- Mots de passe dans URLs
- Clés privées RSA/EC
- Chaînes de connexion DB

## 🔌 Providers IA

### OpenAI Provider

```typescript
// Configuration
{
  type: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
  endpoint: 'https://api.openai.com/v1/chat/completions' // optionnel
}
```

**Modèles supportés:** GPT-4, GPT-4-turbo, GPT-3.5-turbo

### Anthropic Provider

```typescript
// Configuration
{
  type: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-5-sonnet-20241022',
  endpoint: 'https://api.anthropic.com/v1/messages' // optionnel
}
```

**Modèles supportés:** Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

### Azure Provider

```typescript
// Configuration
{
  type: 'azure',
  apiKey: 'your-azure-key',
  model: 'gpt-4', // deployment name
  endpoint: 'https://your-resource.openai.azure.com/' // requis
}
```

**Spécificités:**
- Nécessite un endpoint Azure OpenAI
- Le modèle correspond au nom du deployment
- Version API: 2024-02-15-preview

### Local Provider

```typescript
// Configuration Ollama
{
  type: 'local',
  apiKey: '', // optionnel
  model: 'codellama',
  endpoint: 'http://localhost:11434/v1/chat/completions'
}

// Configuration LM Studio
{
  type: 'local',
  model: 'local-model',
  endpoint: 'http://localhost:1234/v1/chat/completions'
}
```

**Providers supportés:**
- Ollama
- LM Studio
- LocalAI
- Tout serveur OpenAI-compatible

## 🎨 Développement d'Interface

### Ajouter une Vue

1. Créer le composant dans `browser/`
2. Étendre `ViewPane`
3. Enregistrer dans `alphacode.contribution.ts`

```typescript
export class MyView extends ViewPane {
  protected override renderBody(container: HTMLElement): void {
    super.renderBody(container);
    // Votre UI ici
  }
}
```

### Utiliser les Thèmes

```typescript
const theme = this.themeService.getColorTheme();
const background = theme.getColor(SIDE_BAR_BACKGROUND);
```

### Événements

```typescript
this._register(this.service.onDidSomething(data => {
  // Réaction à l'événement
}));
```

## 🔒 Sécurité

### Stockage de Clés API

**Bon:**
```typescript
this.storageService.store(
  'key', 
  value, 
  StorageScope.APPLICATION, 
  StorageTarget.MACHINE
);
```

**Mauvais:**
```typescript
// Ne jamais stocker en WORKSPACE car cela peut être versionné
this.storageService.store('key', value, StorageScope.WORKSPACE);
```

### Masquage de Secrets

```typescript
const maskedContent = this.securityService.maskSecrets(userInput);
```

**Toujours masquer avant:**
- Envoi à une API externe
- Logging
- Affichage dans l'UI

## 🧪 Tests

### Créer un Test

```typescript
suite('AlphaCode AI Service', () => {
  test('should initialize provider', () => {
    const service = new AlphaCodeAIService(storageService);
    assert.ok(service);
  });
});
```

### Lancer les Tests

```bash
npm test
```

## 📝 Conventions de Code

### Naming
- Services: `IMyService`, `MyServiceImpl`
- Interfaces: Préfixe `I`
- Types: PascalCase
- Constantes: UPPER_SNAKE_CASE

### Structure
- Toujours disposer les ressources avec `this._register()`
- Utiliser dependency injection
- Séparer interfaces (`common/`) et implémentations (`browser/`)

### Commentaires
- JSDoc pour toutes les interfaces publiques
- Commentaires inline pour logique complexe
- Headers de license sur tous les fichiers

## 🚀 Ajouter une Fonctionnalité

### 1. Provider IA

```typescript
// 1. Créer le provider
export class MyProvider implements IAIProvider {
  async sendMessage(messages: IAIMessage[]): Promise<IAIResponse> {
    // Implémentation
  }
  
  async sendMessageStream(...): Promise<void> {
    // Implémentation streaming
  }
}

// 2. Ajouter dans aiServiceImpl.ts
case AIProviderType.My:
  this.currentProvider = new MyProvider(this.currentConfig);
  break;

// 3. Ajouter le type dans aiProvider.ts
export enum AIProviderType {
  My = 'my'
}
```

### 2. Agent IA

```typescript
// 1. Ajouter le type dans agents.ts
export enum AgentType {
  MyAgent = 'myAgent'
}

// 2. Implémenter dans agentServiceImpl.ts
async myAgent(input: string): Promise<IAgentResponse> {
  return this.executeAgent({
    type: AgentType.MyAgent,
    instruction: input,
    systemPrompt: 'Your custom system prompt'
  });
}
```

### 3. Commande

```typescript
// Dans alphacodeActions.ts
registerAction2(class extends Action2 {
  constructor() {
    super({
      id: 'alphacode.myCommand',
      title: 'My Command',
      category: 'AlphaCode',
      f1: true
    });
  }
  
  async run(accessor: ServicesAccessor): Promise<void> {
    // Implémentation
  }
});
```

## 🐛 Debugging

### Ouvrir DevTools
`Help` → `Toggle Developer Tools`

### Logs Console
```typescript
console.log('Debug:', data);
console.error('Error:', error);
```

### Breakpoints
1. Ouvrir DevTools
2. Sources tab
3. Trouver votre fichier dans `out/vs/workbench/contrib/alphacode`
4. Ajouter breakpoint

## 📚 Ressources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Anthropic API](https://docs.anthropic.com/claude/reference)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

**Happy Coding with AlphaCodeIDE!** 🚀

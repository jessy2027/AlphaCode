# Fix : Le système de chat n'affiche pas le chat après configuration

## Problème

Après avoir configuré une clé API dans les paramètres AlphaCode, le panneau Vibe Coding continue d'afficher l'écran "Welcome to Vibe Coding" au lieu de basculer vers l'interface du chat.

### Symptômes
- ✗ L'écran Welcome reste affiché après configuration de l'API
- ✗ Le message "pas de chat" ou "Start a Conversation" ne s'affiche jamais
- ✗ L'interface du chat n'est pas accessible même avec une API configurée

## Cause racine

Le problème était multi-facettes :

### 1. **Service AI ne lisait pas la configuration VS Code**
- Le `AlphaCodeAIService` lisait uniquement depuis le **Storage** (ligne 31 de `aiServiceImpl.ts`)
- Les paramètres utilisateur sont dans la **Configuration VS Code** (`alphacode.ai.*`)
- Il n'y avait aucune synchronisation entre les deux

### 2. **Pas d'événement de notification**
- Le service AI n'émettait pas d'événement quand la configuration changeait
- La vue `VibeCodingView` ne pouvait pas détecter les changements de configuration
- Résultat : l'écran Welcome restait affiché même après configuration

### 3. **Pas de création automatique de session**
- Si aucune session de chat n'existait, `renderMessages()` retournait immédiatement
- L'interface restait bloquée sur l'écran Welcome

## Solution implémentée

### Modification 1 : Service AI lit la Configuration VS Code

**Fichier : `src/vs/workbench/contrib/alphacode/browser/aiServiceImpl.ts`**

```typescript
// Ajout de IConfigurationService
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';

constructor(
    @IStorageService private readonly storageService: IStorageService,
    @IConfigurationService private readonly configurationService: IConfigurationService,
) {
    super();
    this.loadConfiguration();
    
    // Écoute les changements de configuration
    this._register(this.configurationService.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('alphacode.ai')) {
            this.loadConfiguration();
            this._onDidChangeConfiguration.fire();
        }
    }));
}

private loadConfiguration(): void {
    // Lit depuis la configuration VS Code
    const provider = this.configurationService.getValue<string>('alphacode.ai.provider');
    const apiKey = this.configurationService.getValue<string>('alphacode.ai.apiKey');
    const model = this.configurationService.getValue<string>('alphacode.ai.model');
    // ... autres paramètres
    
    if (provider && apiKey) {
        // Crée la configuration
        this.currentConfig = {
            type: this.getProviderType(provider),
            apiKey,
            model: model || undefined,
            // ...
        };
        this.initializeProvider();
        console.log('[AlphaCode] AI configuration loaded from settings');
    } else {
        this.currentConfig = undefined;
        this.currentProvider = undefined;
        console.log('[AlphaCode] No AI configuration found');
    }
}
```

**Impact :**
- ✅ La configuration utilisateur est maintenant correctement lue
- ✅ Les changements sont détectés automatiquement
- ✅ Logs pour faciliter le débogage

### Modification 2 : Ajout d'un événement de configuration

**Fichier : `src/vs/workbench/contrib/alphacode/common/aiService.ts`**

```typescript
export interface IAlphaCodeAIService {
    readonly _serviceBrand: undefined;
    
    // Nouvel événement
    readonly onDidChangeConfiguration: Event<void>;
    
    // ... autres méthodes
}
```

**Fichier : `src/vs/workbench/contrib/alphacode/browser/aiServiceImpl.ts`**

```typescript
export class AlphaCodeAIService extends Disposable implements IAlphaCodeAIService {
    private readonly _onDidChangeConfiguration = this._register(new Emitter<void>());
    readonly onDidChangeConfiguration: Event<void> = this._onDidChangeConfiguration.event;
    
    // ... émission de l'événement dans onDidChangeConfiguration
}
```

**Impact :**
- ✅ Les composants peuvent maintenant écouter les changements de configuration AI
- ✅ Architecture réactive et découplée

### Modification 3 : Transition automatique Welcome ↔ Chat

**Fichier : `src/vs/workbench/contrib/alphacode/browser/vibeCodingView.ts`**

```typescript
constructor(...) {
    super(...);
    this.markdownRenderer = new MarkdownRenderer();
    this.isConfigured = !!this.aiService.getProviderConfig();
    
    // Écoute les changements de configuration AI
    this._register(this.aiService.onDidChangeConfiguration(() => {
        const wasConfigured = this.isConfigured;
        this.isConfigured = !!this.aiService.getProviderConfig();
        
        console.log('[VibeCoding] AI config changed:', { wasConfigured, isConfigured: this.isConfigured });
        
        if (!wasConfigured && this.isConfigured && this.containerElement) {
            // Transition Welcome → Chat
            clearNode(this.containerElement);
            this.renderChat(this.containerElement);
            console.log('[VibeCoding] Switched from welcome to chat');
        } else if (wasConfigured && !this.isConfigured && this.containerElement) {
            // Transition Chat → Welcome
            clearNode(this.containerElement);
            this.renderWelcome(this.containerElement);
            console.log('[VibeCoding] Switched from chat to welcome');
        }
    }));
}
```

**Impact :**
- ✅ Transition automatique dès que l'API est configurée
- ✅ Retour automatique à Welcome si la config est supprimée
- ✅ Logs de débogage pour tracer les transitions

### Modification 4 : Création automatique de session

**Fichier : `src/vs/workbench/contrib/alphacode/browser/vibeCodingView.ts`**

```typescript
private renderMessages(): void {
    if (!this.messagesContainer) {
        return;
    }
    
    clearNode(this.messagesContainer);
    
    let session = this.chatService.getCurrentSession();
    
    // Création automatique si aucune session n'existe
    if (!session) {
        session = this.chatService.createSession();
    }
    
    if (session.messages.length === 0) {
        // Affiche "Start a Conversation"
        const empty = append(this.messagesContainer, $('.alphacode-chat-empty'));
        // ...
    }
    
    // Render messages...
}
```

**Impact :**
- ✅ Une session est toujours disponible
- ✅ Plus de plantage si aucune session n'existe
- ✅ UX améliorée

### Modification 5 : Actualisation automatique des messages

```typescript
this._register(this.chatService.onDidAddMessage(() => this.renderMessages()));
```

**Impact :**
- ✅ Les messages s'affichent immédiatement après ajout
- ✅ UI réactive en temps réel

## Fichiers modifiés

1. **`src/vs/workbench/contrib/alphacode/browser/aiServiceImpl.ts`**
   - Ajout de `IConfigurationService`
   - Lecture depuis la configuration VS Code
   - Émission d'événement `onDidChangeConfiguration`
   - Logs de débogage

2. **`src/vs/workbench/contrib/alphacode/common/aiService.ts`**
   - Ajout de l'événement `onDidChangeConfiguration`

3. **`src/vs/workbench/contrib/alphacode/browser/vibeCodingView.ts`**
   - Écoute des changements de configuration AI
   - Transition automatique Welcome ↔ Chat
   - Création automatique de session
   - Actualisation automatique des messages
   - Logs de débogage

## Comment tester

### 1. Compilation
```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run compile
```

### 2. Configuration
Ajouter dans les paramètres (`Ctrl+,` → `@alphacode ai`) :

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-votre-clé",
  "alphacode.ai.model": "gpt-4"
}
```

### 3. Vérification

**Comportement attendu :**
1. L'écran Welcome disparaît automatiquement
2. L'interface du chat s'affiche
3. Message "Start a Conversation" visible
4. Zone de texte et bouton Send disponibles

**Logs attendus dans la console (`Help > Toggle Developer Tools`) :**
```
[AlphaCode] AI configuration loaded from settings: { provider: 'openai', hasApiKey: true, model: 'gpt-4' }
[VibeCoding] AI config changed: { wasConfigured: false, isConfigured: true }
[VibeCoding] Switched from welcome to chat
```

## Dépannage

### Le chat ne s'affiche toujours pas

1. **Vérifiez la configuration :**
   - `alphacode.ai.provider` doit être défini
   - `alphacode.ai.apiKey` doit être défini et non vide
   - Pour OpenAI : la clé doit commencer par `sk-`

2. **Rechargez la fenêtre :**
   - `Ctrl+Shift+P` → `Developer: Reload Window`

3. **Vérifiez les logs :**
   - Ouvrez la console développeur
   - Cherchez les messages `[AlphaCode]` et `[VibeCoding]`
   - Si vous voyez "No AI configuration found", la config n'est pas détectée

4. **Redémarrez VS Code complètement**

### Erreur "No AI provider configured"

- Vérifiez que TOUS les paramètres requis sont définis
- Essayez de redémarrer VS Code

## Améliorations futures possibles

1. **Validation de la clé API** au moment de la saisie
2. **Test de connexion** automatique après configuration
3. **Interface graphique** pour la configuration (au lieu de settings.json)
4. **Stockage sécurisé** des clés API dans le keychain du système
5. **Support de plusieurs configurations** (profiles)
6. **Indicateur visuel** de l'état de la configuration dans la vue

## Notes techniques

- La configuration est lue en temps réel depuis `IConfigurationService`
- Le Storage est conservé comme fallback pour la compatibilité
- Les événements suivent l'architecture VS Code (Emitter/Event)
- Les logs sont préfixés `[AlphaCode]` et `[VibeCoding]` pour faciliter le filtrage

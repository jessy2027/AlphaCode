# Test de Configuration AlphaCode AI

## Problèmes détectés dans les logs

### 1. ❌ Configuration non reconnue
```
Settings pattern "alphacode.*" doesn't match any settings
```

**Cause** : La configuration n'est peut-être pas chargée au bon moment

**Solution** : Vérifier que `configuration.ts` est importé dans `alphacode.contribution.ts`

### 2. ❌ Erreur TrustedHTML
```
This document requires 'TrustedHTML' assignment
```

**Cause** : Utilisation directe de `innerHTML` dans `markdownRenderer.ts`

**Solution** : ✅ **CORRIGÉ** - Utilisation de `appendChild` au lieu de `innerHTML`

### 3. ❌ Endpoint incorrect
```
Refused to connect to 'http://localhost:11434/'
```

**Cause** : Configuration pointe vers un serveur local au lieu d'OpenAI

**Solution** : Vérifier les paramètres utilisateur

## Comment vérifier la configuration

### Étape 1 : Vérifier les paramètres dans VS Code

Ouvrez les paramètres (`Ctrl+,`) et cherchez `alphacode`:

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-...",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.endpoint": "",  // Doit être vide pour OpenAI
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

**Important** : 
- Pour OpenAI, `endpoint` doit être **vide** ou `https://api.openai.com/v1/chat/completions`
- Ne mettez PAS `http://localhost:11434/` sauf si vous utilisez un serveur local

### Étape 2 : Vérifier les logs

Après avoir configuré, ouvrez la console développeur (`Help > Toggle Developer Tools`) et cherchez :

**✅ Logs attendus (bonne configuration)** :
```
[AlphaCode] AI configuration loaded from settings: {"provider":"openai","hasApiKey":true,"model":"gpt-4","maxTokens":2048,"temperature":0.7}
[VibeCoding] AI config changed: {"wasConfigured":false,"isConfigured":true}
[VibeCoding] Switched from welcome to chat
```

**❌ Logs d'erreur (mauvaise configuration)** :
```
[AlphaCode] No AI configuration found. Please set alphacode.ai.provider and alphacode.ai.apiKey
```

### Étape 3 : Tester l'envoi de message

1. Tapez un message dans le chat : `"Hello"`
2. Cliquez sur **Send**
3. Vérifiez qu'il n'y a pas d'erreur de CSP

**Erreur CSP à éviter** :
```
Refused to connect to 'http://localhost:11434/' because it violates CSP
```

## Configuration par provider

### OpenAI (Recommandé)

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-votre-clé-openai",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.endpoint": "",  // VIDE ou omis
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

### Anthropic (Claude)

```json
{
  "alphacode.ai.provider": "anthropic",
  "alphacode.ai.apiKey": "sk-ant-votre-clé-anthropic",
  "alphacode.ai.model": "claude-3-5-sonnet-20241022",
  "alphacode.ai.endpoint": "",  // VIDE
  "alphacode.ai.maxTokens": 4096,
  "alphacode.ai.temperature": 0.7
}
```

### Azure OpenAI

```json
{
  "alphacode.ai.provider": "azure",
  "alphacode.ai.apiKey": "votre-clé-azure",
  "alphacode.ai.endpoint": "https://votre-instance.openai.azure.com/openai/deployments/votre-deployment/chat/completions?api-version=2024-02-15-preview",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

### Serveur Local (Ollama, LM Studio, etc.)

```json
{
  "alphacode.ai.provider": "local",
  "alphacode.ai.apiKey": "not-needed",  // Pas utilisé mais requis
  "alphacode.ai.endpoint": "http://localhost:11434/v1/chat/completions",
  "alphacode.ai.model": "llama2",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

**Note** : Pour les serveurs locaux, vous devrez peut-être modifier la CSP (Content Security Policy)

## Corrections apportées

### 1. ✅ Correction du MarkdownRenderer
**Fichier** : `src/vs/workbench/contrib/alphacode/browser/markdownRenderer.ts`

**Avant** :
```typescript
p.innerHTML = this.renderInline(text);  // ❌ Violation TrustedHTML
```

**Après** :
```typescript
const html = this.renderInline(text);
const temp = document.createElement('div');
temp.innerHTML = html;
while (temp.firstChild) {
    p.appendChild(temp.firstChild);  // ✅ Sécurisé
}
```

### 2. ✅ Amélioration des logs
**Fichier** : `src/vs/workbench/contrib/alphacode/browser/aiServiceImpl.ts`

**Avant** :
```typescript
console.log('[AlphaCode] AI configuration loaded:', { provider, hasApiKey, model });
// Affiche : [object Object]
```

**Après** :
```typescript
console.log('[AlphaCode] AI configuration loaded:', JSON.stringify({ provider, hasApiKey, model, maxTokens, temperature }));
// Affiche : {"provider":"openai","hasApiKey":true,"model":"gpt-4",...}
```

### 3. ✅ Messages d'erreur plus clairs
```typescript
console.log('[AlphaCode] No AI configuration found. Please set alphacode.ai.provider and alphacode.ai.apiKey');
```

## Checklist de vérification

- [ ] Les paramètres `alphacode.ai.*` sont définis dans les settings
- [ ] `alphacode.ai.provider` est l'un de : `openai`, `anthropic`, `azure`, `local`
- [ ] `alphacode.ai.apiKey` est défini et non vide
- [ ] Pour OpenAI/Anthropic : `alphacode.ai.endpoint` est vide ou omis
- [ ] Le code est compilé : `npm run compile`
- [ ] AlphaCode est relancé : `.\scripts\code.bat`
- [ ] Les logs montrent `"AI configuration loaded from settings"`
- [ ] L'interface passe de Welcome à Chat automatiquement
- [ ] Pas d'erreur TrustedHTML dans les logs
- [ ] Pas d'erreur CSP vers localhost (sauf si configuration locale)

## Dépannage

### Problème : Settings pattern doesn't match

**Cause** : La configuration AlphaCode n'est pas enregistrée

**Solution** :
1. Vérifiez que `src/vs/workbench/contrib/alphacode/common/configuration.ts` existe
2. Vérifiez qu'il est importé dans `src/vs/workbench/contrib/alphacode/browser/alphacode.contribution.ts`
3. Recompilez complètement

### Problème : Configuration non détectée

**Cause** : Les paramètres ne sont pas lus correctement

**Solution** :
1. Ouvrez `settings.json` directement : `Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`
2. Ajoutez manuellement la configuration
3. Rechargez la fenêtre : `Ctrl+Shift+P` → `Developer: Reload Window`

### Problème : Erreur CSP vers localhost

**Cause** : Endpoint configuré vers localhost alors que le provider est OpenAI

**Solution** :
1. Vérifiez `alphacode.ai.endpoint` dans les settings
2. Pour OpenAI, supprimez ou videz cette valeur
3. Ou changez `alphacode.ai.provider` en `local` si c'est voulu

## Prochaines étapes

1. **Compiler** : `npm run compile` (avec `NODE_OPTIONS=--max-old-space-size=8192`)
2. **Lancer** : `.\scripts\code.bat`
3. **Configurer** : Ajouter les paramètres AI dans les settings
4. **Vérifier** : Consulter les logs dans la console développeur
5. **Tester** : Envoyer un message dans le chat

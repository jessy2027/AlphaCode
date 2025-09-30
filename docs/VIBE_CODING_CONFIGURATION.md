# Vibe Coding - Guide de Configuration

## Configuration de l'AI Provider

Pour utiliser Vibe Coding, vous devez configurer un fournisseur d'IA avec votre clé API.

### Étape 1 : Ouvrir les paramètres

1. Cliquez sur le bouton **"Open AI Settings"** dans le panneau Vibe Coding
2. Ou utilisez le raccourci : `Ctrl+,` puis recherchez `@alphacode ai`

### Étape 2 : Configurer le Provider

#### Pour OpenAI

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-...",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

**Obtenir une clé API OpenAI :**
1. Visitez : https://platform.openai.com/api-keys
2. Créez une nouvelle clé API
3. Copiez-la dans le paramètre `alphacode.ai.apiKey`

#### Pour Anthropic (Claude)

```json
{
  "alphacode.ai.provider": "anthropic",
  "alphacode.ai.apiKey": "sk-ant-...",
  "alphacode.ai.model": "claude-3-5-sonnet-20241022",
  "alphacode.ai.maxTokens": 4096,
  "alphacode.ai.temperature": 0.7
}
```

**Obtenir une clé API Anthropic :**
1. Visitez : https://console.anthropic.com/settings/keys
2. Créez une nouvelle clé API
3. Copiez-la dans le paramètre `alphacode.ai.apiKey`

#### Pour Azure OpenAI

```json
{
  "alphacode.ai.provider": "azure",
  "alphacode.ai.apiKey": "votre-clé-azure",
  "alphacode.ai.endpoint": "https://votre-instance.openai.azure.com",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

#### Pour un modèle local

```json
{
  "alphacode.ai.provider": "local",
  "alphacode.ai.endpoint": "http://localhost:1234/v1",
  "alphacode.ai.model": "local-model",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

### Étape 3 : Vérification

Après avoir sauvegardé les paramètres :

1. Le panneau Vibe Coding devrait automatiquement passer de l'écran de bienvenue au chat
2. Vous devriez voir "Start a Conversation" avec des suggestions rapides
3. Les logs de la console afficheront : `[AlphaCode] AI configuration loaded from settings`

### Dépannage

#### Le chat ne s'affiche pas après configuration

1. **Vérifiez que la clé API est correcte** :
   - OpenAI : commence par `sk-`
   - Anthropic : commence par `sk-ant-`

2. **Vérifiez les logs de la console** :
   - Ouvrez la console développeur : `Help > Toggle Developer Tools`
   - Cherchez les messages `[AlphaCode]`

3. **Rechargez la fenêtre** :
   - `Ctrl+Shift+P` → `Developer: Reload Window`

#### Message d'erreur lors de l'envoi de messages

Si vous voyez "No AI provider configured" :
- Vérifiez que `alphacode.ai.provider` et `alphacode.ai.apiKey` sont bien définis
- Redémarrez VS Code

Si vous voyez une erreur réseau :
- Vérifiez votre connexion internet
- Pour Azure : vérifiez que l'endpoint est correct
- Pour local : vérifiez que le serveur local est en cours d'exécution

### Paramètres avancés

#### MaxTokens
- Contrôle la longueur maximale des réponses
- OpenAI GPT-4 : jusqu'à 8192 tokens
- Claude 3.5 Sonnet : jusqu'à 4096 tokens
- Plus élevé = réponses plus longues mais plus coûteuses

#### Temperature
- Contrôle la créativité des réponses
- `0` = très déterministe et prévisible
- `1` = plus créatif et varié
- `2` = très créatif (peut être incohérent)
- Recommandé : `0.7` pour l'écriture de code

#### Sécurité
```json
{
  "alphacode.security.maskSecrets": true
}
```
Active le masquage automatique des secrets (tokens, mots de passe, etc.) avant l'envoi à l'IA.

#### Sessions de chat
```json
{
  "alphacode.chat.saveSessions": true,
  "alphacode.chat.streamResponses": true
}
```
- `saveSessions` : Sauvegarder l'historique des conversations
- `streamResponses` : Afficher les réponses en temps réel (streaming)

## Support

Pour plus d'aide, consultez :
- [README Principal](../ALPHACODE_README.md)
- [Fonctionnalités du Chat](./CHAT_FEATURES.md)
- [Issues GitHub](https://github.com/votre-repo/issues)

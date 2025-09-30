# Test Rapide de Vibe Coding

## Comment tester le correctif du système de chat

### 1. Compilation
```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run compile
```

### 2. Lancement d'AlphaCode
```powershell
.\scripts\code.bat
```

### 3. Configuration de l'API

#### Option A : Via les paramètres (Recommandé)

1. Ouvrir le panneau Vibe Coding (icône à gauche)
2. Cliquer sur **"Open AI Settings"**
3. Ajouter votre configuration :

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-votre-clé-ici",
  "alphacode.ai.model": "gpt-4"
}
```

4. Sauvegarder (`Ctrl+S`)

#### Option B : Via settings.json

1. `Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`
2. Ajouter :

```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-votre-clé-ici",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.maxTokens": 2048,
  "alphacode.ai.temperature": 0.7
}
```

### 4. Vérification

#### ✅ Comportement attendu après configuration :

1. **L'écran Welcome devrait disparaître automatiquement**
2. **L'interface du chat devrait s'afficher avec :**
   - Un titre "Vibe Coding Chat"
   - Un bouton "Clear"
   - Un message "Start a Conversation" avec icône 💬
   - Des suggestions rapides (💡 Explain this code, 🔧 Refactor selection, etc.)
   - Une zone de texte avec placeholder "Ask me anything about your code..."
   - Un bouton "Send"

3. **Dans la console développeur (`Help > Toggle Developer Tools`) :**
```
[AlphaCode] AI configuration loaded from settings: { provider: 'openai', hasApiKey: true, model: 'gpt-4' }
[VibeCoding] AI config changed: { wasConfigured: false, isConfigured: true }
[VibeCoding] Switched from welcome to chat
```

#### ❌ Si le chat ne s'affiche toujours pas :

**Problème : L'écran Welcome reste affiché**

Solutions :
1. Vérifiez que la clé API est bien configurée (doit commencer par `sk-` pour OpenAI)
2. Rechargez la fenêtre : `Ctrl+Shift+P` → `Developer: Reload Window`
3. Vérifiez les logs de la console pour voir les erreurs

**Problème : Message "No AI provider configured" lors de l'envoi**

Solutions :
1. Vérifiez que `alphacode.ai.provider` ET `alphacode.ai.apiKey` sont définis
2. Redémarrez complètement VS Code

### 5. Test d'envoi de message

1. Tapez un message dans la zone de texte : `"Hello, can you help me?"`
2. Cliquez sur **Send** ou `Ctrl+Enter`
3. Vous devriez voir :
   - Votre message s'afficher avec l'avatar 👤
   - Un spinner de chargement pour l'AI
   - La réponse de l'AI s'afficher progressivement (streaming)
   - Des boutons d'action (📋 Copy, 🔄 Regenerate)

### 6. Logs de débogage

Pour suivre le comportement en temps réel :

```javascript
// Dans la console développeur
// Filtrez par "[AlphaCode]" ou "[VibeCoding]"
```

**Messages importants :**
- `[AlphaCode] AI configuration loaded from settings` → Configuration chargée ✅
- `[AlphaCode] No AI configuration found` → Aucune config trouvée ❌
- `[VibeCoding] AI config changed` → Changement détecté ✅
- `[VibeCoding] Switched from welcome to chat` → Transition réussie ✅

### 7. Cas de test supplémentaires

#### Test 1 : Changement de provider
1. Configurez OpenAI
2. Vérifiez que le chat s'affiche
3. Changez pour Anthropic
4. Le chat devrait rester affiché

#### Test 2 : Suppression de la clé API
1. Configurez l'API
2. Chat s'affiche
3. Supprimez `alphacode.ai.apiKey`
4. Le chat devrait repasser à l'écran Welcome

#### Test 3 : Session persistante
1. Envoyez quelques messages
2. Fermez et rouvrez AlphaCode
3. Les messages précédents devraient être conservés

### Corrections apportées

1. **Service AI lit maintenant depuis la Configuration VS Code** au lieu du Storage
2. **Événement `onDidChangeConfiguration`** émis par le service AI
3. **Transition automatique** Welcome ↔ Chat lors des changements de config
4. **Création automatique de session** si aucune n'existe
5. **Logs de débogage** pour faciliter le diagnostic

### Points de contrôle

- [ ] La compilation termine sans erreurs
- [ ] AlphaCode démarre correctement
- [ ] L'écran Welcome s'affiche initialement
- [ ] Après configuration de l'API, le chat s'affiche automatiquement
- [ ] Les messages peuvent être envoyés et reçus
- [ ] Les logs de débogage sont visibles dans la console
- [ ] La session est persistante après rechargement

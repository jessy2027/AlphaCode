# Guide de Test - Système d'Outils AI

## Préparation

1. **Ouvrir la Console de Développement**
   - Appuyez sur `F12` ou `Ctrl+Shift+I`
   - Allez dans l'onglet "Console"
   - Vous verrez les logs `[AlphaCode]` pendant les tests

2. **Ouvrir la Vue Vibe Coding**
   - Cliquez sur l'icône AlphaCode dans la barre latérale
   - Assurez-vous que votre API AI est configurée

## Tests de Base

### Test 1 : Création de Fichier Simple

**Objectif** : Vérifier que l'outil `write_file` fonctionne en streaming.

**Prompt** :
```
Crée un fichier hello.py avec une fonction hello world
```

**Comportement attendu** :
1. L'IA répond avec un bloc ````tool`
2. **IMMÉDIATEMENT** pendant le streaming :
   - Console : `[AlphaCode] Tool detected during streaming: write_file`
   - Console : `[AlphaCode] Creating edit proposal: proposal-1 for hello.py`
   - Console : `[AlphaCode] Opening diff editor for proposal: proposal-1`
3. Une vue diff s'ouvre automatiquement :
   - **Gauche** : Vide ou contenu original
   - **Droite** : Nouveau code Python (en vert)
4. Dans le chat, un message outil apparaît avec :
   - Icône 🛠️
   - Status "Success"
   - Boutons "Accept change" et "Reject change"

**Actions** :
- Cliquez sur "Accept change"
  - Console : `[AlphaCode] Accepting proposal: proposal-1`
  - Le fichier `hello.py` est créé dans votre workspace
- OU cliquez sur "Reject change"
  - Console : `[AlphaCode] Rejecting proposal: proposal-1`
  - Console : `[AlphaCode] Rolled back changes`
  - Aucun fichier créé

### Test 2 : Modification de Fichier

**Préparation** : Créez manuellement un fichier `test.txt` avec :
```
Hello World
This is a test
```

**Prompt** :
```
Modifie test.txt pour remplacer "test" par "example"
```

**Comportement attendu** :
1. Détection immédiate de l'outil `edit_file` en streaming
2. Ouverture automatique de la diff :
   - **Rouge** : `This is a test` (supprimé)
   - **Vert** : `This is a example` (ajouté)
3. Boutons d'acceptation/rejet dans le chat

**Actions** :
- Accept : Le fichier est modifié
- Reject : Le fichier reste inchangé (rollback)

### Test 3 : Plusieurs Fichiers en Streaming

**Prompt** :
```
Crée deux fichiers : main.js avec une fonction main et utils.js avec une fonction helper
```

**Comportement attendu** :
1. Premier outil détecté : `write_file` pour `main.js`
   - Exécution immédiate
   - Diff ouverte pour main.js
2. Deuxième outil détecté : `write_file` pour `utils.js`
   - Exécution immédiate (en parallèle)
   - Diff ouverte pour utils.js
3. Deux propositions visibles dans le chat

### Test 4 : Rollback après Modification

**Préparation** : Créez un fichier `rollback-test.txt` avec :
```
Original content
Line 2
Line 3
```

**Prompt** :
```
Modifie rollback-test.txt pour ajouter "Modified" à chaque ligne
```

**Actions** :
1. Acceptez la modification
   - Le fichier est modifié
2. Demandez à l'IA : "Annule la dernière modification"
3. Utilisez le bouton "Reject" sur la proposition suivante
   - Le fichier devrait revenir à son état original

**Vérification** :
```bash
# Ouvrez le fichier et vérifiez le contenu
cat rollback-test.txt
```

## Tests Avancés

### Test 5 : Contrôle Granulaire

**Utilisation de l'API** :
```typescript
// Dans la console développeur
const chatService = accessor.get('IAlphaCodeChatService');
const proposals = chatService.getPendingProposals();
console.log('Pending proposals:', proposals);

// Accepter partiellement
await chatService.applyProposalDecision({
  proposalId: proposals[0].id,
  action: 'accept-changes',
  changeIndexes: [0, 2] // Accepte seulement les changements 0 et 2
});
```

### Test 6 : Audit Log

**Vérification** :
```typescript
const chatService = accessor.get('IAlphaCodeChatService');
const auditLog = chatService.getProposalAuditLog();
console.log('Audit log:', auditLog);

// Devrait afficher :
// [
//   { id: 'proposal-1', path: 'hello.py', action: 'accepted', timestamp: ... },
//   { id: 'proposal-2', path: 'test.txt', action: 'rejected', timestamp: ... },
//   ...
// ]
```

### Test 7 : Lecture de Fichier (sans diff)

**Prompt** :
```
Lis le contenu du fichier package.json
```

**Comportement attendu** :
1. Outil `read_file` détecté
2. **PAS de diff** car c'est un outil de lecture
3. Message outil avec le contenu du fichier
4. Pas de boutons Accept/Reject

## Vérification des Logs Console

Pendant tous les tests, surveillez la console pour ces logs :

### Détection d'Outil
```
[AlphaCode] Tool detected during streaming: write_file {path: "...", content: "..."}
```

### Création de Proposition
```
[AlphaCode] Creating edit proposal: proposal-1 for test.py
[AlphaCode] Changes detected: 5
```

### Ouverture de Diff
```
[AlphaCode] Opening diff editor for proposal: proposal-1
[AlphaCode] Diff editor opened successfully: yes
```

### Acceptation
```
[AlphaCode] Accepting proposal: proposal-1
```

### Rejet avec Rollback
```
[AlphaCode] Rejecting proposal: proposal-1
[AlphaCode] Rolled back changes for: test.py
```

## Problèmes Courants

### La diff ne s'ouvre pas

**Vérification** :
1. Regardez la console pour des erreurs
2. Vérifiez que l'éditeur de services fonctionne
3. Essayez de redémarrer l'IDE

**Solution** :
```typescript
// Vérifier que l'éditeur service est disponible
const editorService = accessor.get('IEditorService');
console.log('Editor service:', editorService);
```

### L'outil n'est pas détecté

**Vérification** :
1. Le format du bloc outil est correct :
```
```tool
{
  "name": "write_file",
  "parameters": {...}
}
```
```

2. Le JSON est valide (pas de virgules manquantes, guillemets corrects)

**Solution** :
- Demandez à l'IA de reformater l'outil
- Vérifiez les logs `[AlphaCode] Tool detected`

### Le rollback ne fonctionne pas

**Vérification** :
1. Le backup existe dans `backupContents` map
2. Le fichier n'a pas été modifié manuellement entre-temps

**Debug** :
```typescript
const chatService = accessor.get('IAlphaCodeChatService');
console.log('Backup contents:', chatService['backupContents']);
```

## Checklist de Validation

- [ ] Outil détecté pendant le streaming (pas à la fin du message)
- [ ] Diff ouverte automatiquement pour write_file et edit_file
- [ ] Couleurs correctes dans la diff (rouge = suppression, vert = ajout)
- [ ] Boutons Accept/Reject visibles dans le chat
- [ ] Accept applique les changements au fichier
- [ ] Reject effectue un rollback
- [ ] Logs console affichent toutes les étapes
- [ ] Plusieurs outils peuvent être détectés dans un même message
- [ ] L'audit log enregistre toutes les décisions
- [ ] Les outils de lecture (read_file) n'ouvrent pas de diff

## Performance

**Mesure du temps d'exécution** :
```typescript
// La diff devrait s'ouvrir en < 500ms après la détection de l'outil
// Le rollback devrait prendre < 100ms
```

## Rapport de Bug

Si vous trouvez un problème :

1. **Console Logs** : Copiez tous les logs `[AlphaCode]`
2. **État** : Notez l'état des propositions (`getPendingProposals()`)
3. **Prompt** : Notez exactement ce que vous avez demandé à l'IA
4. **Comportement** : Décrivez ce qui s'est passé vs ce qui était attendu
5. **Fichiers** : Listez les fichiers affectés

## Conclusion

Le système d'outils devrait fonctionner de manière **fluide** et **instantanée** :
- Détection en temps réel pendant le streaming
- Ouverture automatique des diffs
- Rollback fiable en cas de rejet
- Logging complet pour le debugging

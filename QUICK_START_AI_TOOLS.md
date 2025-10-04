# Quick Start - Système d'Outils AI

## 🚀 Démarrage Rapide

### 1. Ouvrir la Console de Debug
```
Appuyez sur F12 → Onglet "Console"
```
Vous verrez les logs `[AlphaCode]` pendant l'utilisation.

### 2. Tester la Création de Fichier

**Dans le chat Vibe Coding** :
```
Crée un fichier hello.py avec une fonction hello world
```

**Ce qui va se passer** :
1. L'IA commence à répondre
2. Console : `[AlphaCode] Tool detected during streaming: write_file`
3. **Une diff s'ouvre automatiquement** 📝
4. Vous voyez le nouveau code en **vert** ✅
5. Un message apparaît dans le chat avec boutons "Accept" / "Reject"

**Actions** :
- Cliquez **"Accept change"** → Le fichier est créé ✓
- Cliquez **"Reject change"** → Rien n'est créé, rollback ✗

### 3. Tester la Modification de Fichier

**Créez manuellement `test.txt`** :
```
Hello World
This is a test
```

**Dans le chat** :
```
Modifie test.txt pour remplacer "test" par "example"
```

**Ce qui va se passer** :
1. Diff s'ouvre automatiquement
2. **Rouge** : `This is a test` (ligne supprimée)
3. **Vert** : `This is a example` (ligne ajoutée)
4. Boutons Accept/Reject dans le chat

### 4. Vérifier le Rollback

**Après avoir modifié un fichier** :
1. Cliquez **"Reject change"**
2. Console : `[AlphaCode] Rolled back changes for: test.txt`
3. Vérifiez que le fichier est revenu à son état original

## 🎯 Comportement Attendu

| Action | Résultat |
|--------|----------|
| L'IA utilise un outil | Exécution **IMMÉDIATE** (pendant le streaming) |
| Outil `write_file` ou `edit_file` | Diff s'ouvre **AUTOMATIQUEMENT** |
| Visualisation | Rouge = suppression, Vert = ajout |
| Accept | Fichier modifié ✓ |
| Reject | Rollback automatique ✗ |

## 📊 Logs à Surveiller

Si tout fonctionne, vous devriez voir dans la console :
```
[AlphaCode] Tool detected during streaming: write_file {...}
[AlphaCode] Creating edit proposal: proposal-1 for hello.py
[AlphaCode] Changes detected: 3
[AlphaCode] Opening diff editor for proposal: proposal-1
[AlphaCode] Diff editor opened successfully: yes
```

Lors de l'acceptation :
```
[AlphaCode] Accepting proposal: proposal-1
```

Lors du rejet :
```
[AlphaCode] Rejecting proposal: proposal-1
[AlphaCode] Rolled back changes for: hello.py
```

## ⚠️ Problèmes Courants

### La diff ne s'ouvre pas
- Vérifiez la console pour des erreurs
- Vérifiez que le format JSON de l'outil est correct
- Redémarrez l'IDE si nécessaire

### L'outil n'est pas détecté
- Le format doit être exactement :
```
```tool
{
  "name": "write_file",
  "parameters": {
    "path": "...",
    "content": "..."
  }
}
```
```

### Le rollback ne fonctionne pas
- Ne modifiez pas le fichier manuellement entre la création de la proposition et le rejet
- Vérifiez les logs console pour plus d'infos

## 📚 Documentation Complète

- **`docs/AI_TOOL_SYSTEM.md`** : Documentation technique complète
- **`docs/TESTING_AI_TOOLS.md`** : Guide de test détaillé
- **`CHANGELOG_AI_TOOLS.md`** : Historique des changements
- **`SUMMARY_CORRECTIONS.md`** : Résumé des corrections

## 🎉 C'est Tout !

Le système est maintenant **100% fonctionnel** :
- ✅ Exécution en streaming
- ✅ Diff automatique avec couleurs
- ✅ Rollback en cas de rejet
- ✅ Logging complet

**Amusez-vous bien avec votre assistant IA !** 🚀

# Phase 3 - Guide de démarrage rapide

## 🎯 Objectif

Contrôler et valider les modifications proposées par l'IA avant application.

## 🚀 Démarrage en 30 secondes

### Pour les utilisateurs

1. **Demandez une modification à l'IA**
   ```
   "Crée un fichier utils.ts avec une fonction de validation"
   ```

2. **Le diff s'ouvre automatiquement** dans l'éditeur

3. **Consultez la vue des proposals** (panneau latéral)

4. **Choisissez votre action** :
   - `Accept All` - Accepter tout
   - `Reject All` - Rejeter tout
   - `Show Details` → Cochez/décochez → `Apply Selected` - Contrôle ligne par ligne

### Pour arrêter l'IA

- Cliquez sur le bouton **Stop** qui apparaît pendant la génération

## 📋 Actions disponibles

### Actions globales

| Action | Description |
|--------|-------------|
| **Accept All** | Accepte tous les proposals en attente |
| **Reject All** | Rejette tous les proposals en attente |

### Actions par proposal

| Action | Description |
|--------|-------------|
| **Accept All** | Accepte toutes les modifications du fichier |
| **Reject All** | Rejette toutes les modifications du fichier |
| **View Diff** | Focus sur l'éditeur de diff |
| **Show Details** | Affiche les changements ligne par ligne |
| **Apply Selected** | Applique uniquement les changements cochés |

### Contrôle de génération

| Action | Description |
|--------|-------------|
| **Stop** | Arrête la génération IA en cours |

## 🔍 Exemples pratiques

### Exemple 1 : Acceptation rapide

```
Vous: "Ajoute une fonction de logging"
IA: 📝 Crée proposal-1 pour logger.ts
     3 lignes ajoutées
Vous: [Clique Accept All]
✓ Fichier créé avec succès
```

### Exemple 2 : Révision sélective

```
Vous: "Refactor cette classe"
IA: ✏️ Modifie proposal-2 pour MyClass.ts
     5 lignes modifiées, 2 ajoutées
Vous: [Clique Show Details]
     [Décoche les lignes 15-16]
     [Clique Apply Selected Changes]
✓ 5 changements appliqués (2 ignorés)
```

### Exemple 3 : Rejet complet

```
Vous: "Change l'architecture"
IA: 📝 Crée 3 proposals
Vous: [Examine les diffs]
     [Clique Reject All]
✓ Tous les proposals rejetés
```

### Exemple 4 : Stop en cours

```
Vous: "Explique toute la codebase en détail"
IA: [Commence à générer...]
Vous: [Clique Stop]
✓ Génération arrêtée
```

## 🎨 Interface utilisateur

### Vue des proposals

```
╔════════════════════════════════════╗
║ AI Edit Proposals                  ║
║ [Accept All] [Reject All]          ║
╠════════════════════════════════════╣
║ 📝 Create  src/file.ts             ║
║ 3 lines added                      ║
║ [Accept] [Reject] [View]           ║
║                                    ║
║ ✏️ Edit  src/main.ts               ║
║ 2 modified, 1 added                ║
║ [Accept] [Reject] [View]           ║
╚════════════════════════════════════╝
```

### Détails des changements

```
╔════════════════════════════════════╗
║ Changes (3) [Hide Details ▲]       ║
╠════════════════════════════════════╣
║ ☑ Line 10                          ║
║   - const x = 1;                   ║
║   + const x = 2;                   ║
║                                    ║
║ ☑ Line 15                          ║
║   - // TODO                        ║
║   + // DONE                        ║
║                                    ║
║ ☐ Line 20 (décoché)                ║
║   - return null;                   ║
║   + return undefined;              ║
╠════════════════════════════════════╣
║ [Apply Selected Changes]           ║
╚════════════════════════════════════╝
```

### Toolbar avec Stop

```
╔════════════════════════════════════╗
║ Vibe Coding Chat  [Clear] [Stop]🔴 ║
╠════════════════════════════════════╣
║ Génération en cours...             ║
╚════════════════════════════════════╝
```

## 📊 Audit des décisions

Accédez à l'historique complet :

```typescript
const log = chatService.getProposalAuditLog();
// Affiche les 200 dernières décisions
```

Format :
```javascript
[
  {
    id: 'proposal-1',
    path: 'src/file.ts',
    action: 'accepted',
    timestamp: 1234567890
  }
]
```

## ⌨️ Raccourcis clavier (à venir)

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Shift+A` | Accept All |
| `Ctrl+Shift+R` | Reject All |
| `Ctrl+Shift+D` | View Diff |
| `Escape` | Stop génération |

## 🔧 Configuration

### Activer/Désactiver l'ouverture auto du diff

```json
{
  "alphacode.tools.autoOpenDiff": true
}
```

### Limite de proposals en attente

```json
{
  "alphacode.tools.maxPendingProposals": 10
}
```

### Audit log

```json
{
  "alphacode.tools.auditLogSize": 200
}
```

## 💡 Conseils

### ✅ Bonnes pratiques

- **Examinez toujours** les diffs avant d'accepter
- **Utilisez le contrôle granulaire** pour les changements complexes
- **Consultez l'audit log** régulièrement
- **Arrêtez l'IA** si elle dévie du sujet

### ⚠️ À éviter

- Accepter sans regarder les gros refactorings
- Laisser trop de proposals s'accumuler
- Oublier de vérifier les impacts sur d'autres fichiers

## 🐛 Problèmes courants

### Le diff ne s'ouvre pas

**Solution** : Vérifiez que le fichier existe et que vous avez les permissions

### Les changements ne s'appliquent pas

**Solution** : Vérifiez qu'il n'y a pas de conflits avec d'autres modifications

### Trop de proposals en attente

**Solution** : Utilisez "Reject All" ou "Accept All" pour nettoyer

### Le bouton Stop ne répond pas

**Solution** : L'IA a peut-être déjà fini. Actualisez l'interface.

## 🔗 Liens utiles

- [Documentation complète](PHASE3_TOOL_CONTROL.md)
- [Architecture technique](CHAT_AGENT_IMPLEMENTATION.md)
- [API des outils](CHAT_TOOLS_INDEX.md)
- [Roadmap](roadmap.md)

## 📞 Support

Pour toute question ou problème :

1. Consultez la documentation complète
2. Vérifiez les issues GitHub
3. Contactez l'équipe de support

---

**Dernière mise à jour** : Octobre 2025  
**Version** : 1.0.0

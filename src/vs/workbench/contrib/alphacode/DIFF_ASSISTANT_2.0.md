# Diff Assistant 2.0 - Documentation Technique

## Vue d'ensemble

Le Diff Assistant 2.0 est une refonte complète du système de propositions d'IA pour AlphaCode, offrant :
- ✅ Injection directe des modifications sur le buffer actif
- ✅ Moteur de rollback transactionnel avec support undo/redo natif
- ✅ Validation stricte des chemins de fichiers
- ✅ Vue de validation par chunks avec diff rouge/vert
- ✅ Synchronisation en temps réel entre la vue et l'éditeur

---

## Architecture

### Composants principaux

#### 1. **TransactionManager** (`transactionManager.ts`)
Gère l'application transactionnelle des propositions avec support complet du rollback.

**Fonctionnalités :**
- Application des changements via `ITextModel.pushEditOperations()`
- Intégration avec `IUndoRedoService` pour Ctrl+Z natif
- Historique des transactions par fichier
- Rollback granulaire (transaction par transaction ou fichier complet)

**Exemple d'utilisation :**
```typescript
const transaction = await transactionManager.applyProposal(proposal, [0, 2, 5]);
// Transaction ID retourné pour référence future

// Rollback si nécessaire
await transactionManager.rollback(transaction.id);
```

#### 2. **ProposalUndoElement** (`proposalUndoElement.ts`)
Élément d'undo/redo compatible avec le système VSCode.

**Interface :**
```typescript
interface IProposalTransaction {
    id: string;
    proposalId: string;
    filePath: string;
    timestamp: number;
    versionId: number;
    originalContent: string;
    appliedContent: string;
    chunkIndexes: number[];
}
```

#### 3. **ProposalManager** (modifié)
Gestionnaire principal des propositions avec validation de chemin renforcée.

**Nouvelles méthodes :**
- `validateFilePath()` : Vérifie que le chemin pointe vers un fichier valide
- `rollbackTransaction()` : Rollback d'une transaction spécifique
- `rollbackFile()` : Rollback de toutes les transactions d'un fichier
- `getFileTransactions()` : Historique des transactions

**Changements majeurs :**
- Remplacement de `fileService.writeFile()` par éditions directes via `TransactionManager`
- Validation `fileService.stat()` avant ajout de proposition
- Support async pour `addProposal()`

#### 4. **ProposalsView** (refonte complète)
Interface utilisateur pour la validation chunk-par-chunk.

**Structure visuelle :**
```
┌─ Proposal Card ────────────────────────────┐
│ 📄 filename.ts                 +3 -2       │
│                                             │
│ ┌─ Chunk 1 @ line 5 ─────────────────┐    │
│ │ − Removed:                          │    │
│ │   old code here                     │    │
│ │ + Added:                            │    │
│ │   new code here                     │    │
│ │                  [Accept] [Reject]  │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Chunk 2 @ line 12 ────────────────┐    │
│ │ ...                                 │    │
│ └─────────────────────────────────────┘    │
│                                             │
│              [Accept all] [Reject all]     │
└─────────────────────────────────────────────┘
```

**Fonctionnalités :**
- Diff inline rouge/vert pour chaque chunk
- Boutons Accept/Reject par chunk
- Compteur de changements en temps réel
- Animation smooth lors des actions

#### 5. **ProposalEditorService** (synchronisé)
Service gérant les décorations dans l'éditeur.

**Nouvelles méthodes :**
- `updateProposal()` : Mise à jour des décorations après modification de chunks
- Synchronisation automatique avec `ProposalsView`

---

## Workflow utilisateur

### Scénario 1 : Acceptation complète d'une proposition

1. L'IA génère une proposition avec 3 chunks
2. L'utilisateur clique "Accept all" dans `ProposalsView`
3. `ProposalManager` appelle `TransactionManager.applyProposal()` avec tous les index
4. Le `TransactionManager` :
   - Crée un `ProposalUndoElement`
   - Applique les éditions via `model.pushEditOperations()`
   - Enregistre la transaction dans `IUndoRedoService`
5. Les décorations sont supprimées automatiquement
6. L'utilisateur peut faire Ctrl+Z pour rollback natif

### Scénario 2 : Acceptation partielle chunk-par-chunk

1. L'utilisateur clique "Accept" sur le chunk 0
2. `chatService.applyProposalDecision()` est appelé avec `changeIndexes: [0]`
3. Le chunk est appliqué via `TransactionManager`
4. `ProposalEditorService.updateProposal()` met à jour les décorations
5. Le chunk 0 disparaît de la vue
6. Les chunks restants sont réindexés automatiquement

### Scénario 3 : Rollback manuel

```typescript
// Obtenir l'historique
const transactions = proposalManager.getFileTransactions('/path/to/file.ts');

// Rollback d'une transaction spécifique
await proposalManager.rollbackTransaction(transactions[0].id);

// Ou rollback complet du fichier
await proposalManager.rollbackFile('/path/to/file.ts');
```

---

## Sécurité et validation

### Validation de chemin (nouvelle fonctionnalité)

Avant d'ajouter une proposition, le système vérifie :

1. **Schéma URI** : Doit être `file://`
2. **Type de ressource** : Doit être un fichier (pas un dossier)
3. **Existence** : Le fichier doit exister

```typescript
// Exemple de validation
private async validateFilePath(filePath: string): Promise<boolean> {
    const uri = URI.file(filePath);

    // Vérification du schéma
    if (uri.scheme !== 'file') {
        return false;
    }

    // Vérification du type
    const stat = await this.fileService.stat(uri);
    if (stat.type !== FileType.File) {
        return false;
    }

    return true;
}
```

**Impact :** Prévient l'ouverture accidentelle de répertoires et les erreurs de chemin.

---

## Intégration undo/redo

Le système s'intègre nativement avec VSCode via `IUndoRedoService`.

**Avantages :**
- Ctrl+Z fonctionne immédiatement après application
- Historique unifié avec les autres éditions
- Support du redo (Ctrl+Shift+Z)

**Implémentation :**
```typescript
const undoElement = new ProposalUndoElement(
    uri,
    transaction,
    () => this.getModel(uri),
    (content) => this.applyContentToModel(uri, content)
);

this.undoRedoService.pushElement(undoElement);
```

---

## Performance et optimisations

### Éditions par batch
Les chunks sont appliqués en une seule opération via `model.pushEditOperations()`, ce qui :
- Minimise les reflows de l'éditeur
- Réduit les events de changement
- Améliore la réactivité

### Gestion mémoire
- Les transactions sont automatiquement nettoyées après suppression de proposition
- Décorations disposées proprement via `clearDecorations()`
- Listeners d'événements disposés avec `DisposableStore`

### Animations CSS
Utilisation de `transform` au lieu de `margin/padding` pour des animations 60fps :
```css
.chunk-card {
    transition: transform 0.2s, box-shadow 0.2s;
}

.chunk-card:hover {
    transform: translateY(-1px);
}
```

---

## Tests

### Tests unitaires
- `transactionManager.test.ts` : Tests du moteur de transactions
- `proposalWorkflow.test.ts` : Tests d'intégration du workflow complet

### Scénarios testés
1. ✅ Création de transaction
2. ✅ Rollback de transaction
3. ✅ Validation de chemin
4. ✅ Application chunk-par-chunk
5. ✅ Synchronisation décorations

---

## Migration depuis l'ancien système

### Changements breaking

1. **`addProposal()` est maintenant async**
   ```typescript
   // Avant
   proposalManager.addProposal(proposal);

   // Après
   await proposalManager.addProposal(proposal);
   ```

2. **Plus de `backupContents` Map**
   - Le backup est géré automatiquement par les transactions
   - Pas besoin de gérer manuellement les sauvegardes

3. **Nouveaux paramètres de constructeur pour ProposalManager**
   ```typescript
   constructor(
       fileService: IFileService,
       editorService: IEditorService,
       textModelService: ITextModelService,  // NOUVEAU
       undoRedoService: IUndoRedoService     // NOUVEAU
   )
   ```

### Guide de migration

```typescript
// 1. Mettre à jour les imports
import { ITextModelService } from '...';
import { IUndoRedoService } from '...';

// 2. Injecter les nouveaux services
constructor(
    @IFileService fileService: IFileService,
    @IEditorService editorService: IEditorService,
    @ITextModelService textModelService: ITextModelService,
    @IUndoRedoService undoRedoService: IUndoRedoService
) {
    this.proposalManager = new ProposalManager(
        fileService,
        editorService,
        textModelService,
        undoRedoService
    );
}

// 3. Adapter les appels async
async createProposal(proposal: IEditProposalWithChanges) {
    await this.proposalManager.addProposal(proposal);
}
```

---

## Roadmap et améliorations futures

### Phase suivante (P2 - Observabilité)
- [ ] Logs détaillés des transactions
- [ ] Métriques de performance (temps d'application)
- [ ] Notifications utilisateur pour les erreurs de validation

### Améliorations envisagées
- [ ] Support des conflits de merge
- [ ] Prévisualisation en temps réel dans l'éditeur
- [ ] Diff 3-way pour les modifications concurrentes
- [ ] Export de l'historique des transactions

---

## Troubleshooting

### Problème : Les décorations ne disparaissent pas après acceptation

**Solution :** Vérifier que `ProposalEditorService.updateProposal()` est bien appelé après `applyPartialChanges()`.

### Problème : Ctrl+Z ne fonctionne pas

**Solution :** S'assurer que `IUndoRedoService` est correctement injecté et que `pushElement()` est appelé.

### Problème : Erreur "Path is not a file"

**Solution :** Le chemin pointe vers un dossier. Utiliser `fileService.stat()` pour vérifier avant.

---

## Contacts et support

- **Équipe AlphaCode** : [Lien vers canal de communication]
- **Issues GitHub** : [Lien vers repo]
- **Documentation VSCode Undo/Redo** : [src/vs/platform/undoRedo/common/undoRedo.ts](../../../platform/undoRedo/common/undoRedo.ts)

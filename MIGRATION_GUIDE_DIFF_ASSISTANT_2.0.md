# Migration Guide - Diff Assistant 2.0

## 🎯 Objectif
Ce guide facilite la migration du code existant vers le nouveau système Diff Assistant 2.0.

---

## ⚠️ Changements Breaking

### 1. `ProposalManager.addProposal()` est maintenant async

**Avant (v1.0) :**
```typescript
proposalManager.addProposal(proposal);
```

**Après (v2.0) :**
```typescript
await proposalManager.addProposal(proposal);
```

**Raison :** Validation asynchrone du chemin via `fileService.stat()`.

**Impact :** Tout code appelant `addProposal()` doit être mis à jour pour utiliser `await`.

---

### 2. Nouveau constructeur pour `ProposalManager`

**Avant (v1.0) :**
```typescript
constructor(
    fileService: IFileService,
    editorService: IEditorService
)
```

**Après (v2.0) :**
```typescript
constructor(
    fileService: IFileService,
    editorService: IEditorService,
    textModelService: ITextModelService,  // NOUVEAU
    undoRedoService: IUndoRedoService     // NOUVEAU
)
```

**Migration :**
```typescript
// Avant
const proposalManager = new ProposalManager(fileService, editorService);

// Après - avec injection de dépendances
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
```

---

### 3. Suppression de `backupContents` Map

**Avant (v1.0) :**
```typescript
// Backup manuel dans ProposalManager
private backupContents = new Map<string, string>();

// Restoration manuelle
const backup = this.backupContents.get(proposal.filePath);
await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
```

**Après (v2.0) :**
```typescript
// Backup automatique via transactions
// Plus besoin de gérer manuellement

// Rollback via TransactionManager
await proposalManager.rollbackTransaction(transactionId);
// OU
await proposalManager.rollbackFile(filePath);
```

**Impact :** Tout code accédant à `backupContents` doit être supprimé.

---

### 4. Validation de chemin stricte

**Comportement v1.0 :**
- Aucune validation avant `addProposal()`
- Possibilité d'ajouter des propositions vers des dossiers

**Comportement v2.0 :**
```typescript
await proposalManager.addProposal(proposal);
// Lève une erreur si :
// - URI scheme !== 'file'
// - Chemin pointe vers un dossier
// - Fichier n'existe pas
```

**Migration :**
```typescript
// Ajouter un try/catch
try {
    await proposalManager.addProposal(proposal);
} catch (error) {
    console.error('Invalid proposal path:', error);
    // Gérer l'erreur (notification utilisateur, etc.)
}
```

---

## 🔄 Changements d'API

### Nouvelles méthodes disponibles

#### `ProposalManager.rollbackTransaction()`
```typescript
// Rollback d'une transaction spécifique
await proposalManager.rollbackTransaction(transactionId);
```

#### `ProposalManager.rollbackFile()`
```typescript
// Rollback de toutes les transactions d'un fichier
await proposalManager.rollbackFile('/path/to/file.ts');
```

#### `ProposalManager.getFileTransactions()`
```typescript
// Obtenir l'historique des transactions
const transactions = proposalManager.getFileTransactions('/path/to/file.ts');
transactions.forEach(tx => {
    console.log(`Transaction ${tx.id} at ${new Date(tx.timestamp)}`);
});
```

#### `ProposalEditorService.updateProposal()`
```typescript
// Mise à jour des décorations après modification de chunks
await proposalEditorService.updateProposal(proposal);
```

---

## 📦 Nouveaux imports requis

```typescript
// Nouveaux imports à ajouter
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { FileType } from '../../../../platform/files/common/files.js';

// Imports pour les nouveaux composants
import { TransactionManager } from './transactionManager.js';
import { IProposalTransaction } from './proposalUndoElement.js';
```

---

## 🛠️ Guide de migration pas-à-pas

### Étape 1 : Mettre à jour les imports

```typescript
// Dans votre fichier service principal (ex: chatServiceImpl.ts)

// Ajouter
import { ITextModelService } from '...';
import { IUndoRedoService } from '...';
```

### Étape 2 : Injecter les nouveaux services

```typescript
export class AlphaCodeChatService extends Disposable {
    constructor(
        @IFileService fileService: IFileService,
        @IEditorService editorService: IEditorService,
        // Ajouter ces deux lignes
        @ITextModelService textModelService: ITextModelService,
        @IUndoRedoService undoRedoService: IUndoRedoService
    ) {
        super();

        // Passer les nouveaux services au ProposalManager
        this.proposalManager = new ProposalManager(
            fileService,
            editorService,
            textModelService,    // NOUVEAU
            undoRedoService      // NOUVEAU
        );
    }
}
```

### Étape 3 : Rendre async tous les appels à `addProposal()`

```typescript
// Avant
createProposal(proposal: IEditProposalWithChanges) {
    this.proposalManager.addProposal(proposal);
}

// Après
async createProposal(proposal: IEditProposalWithChanges) {
    try {
        await this.proposalManager.addProposal(proposal);
    } catch (error) {
        // Gérer l'erreur de validation
        console.error('Failed to add proposal:', error);
        throw error;
    }
}
```

### Étape 4 : Supprimer les backups manuels

```typescript
// Supprimer ces lignes
private backupContents = new Map<string, string>();
this.backupContents.set(proposal.filePath, proposal.originalContent);
const backup = this.backupContents.get(proposal.filePath);

// Le système de transactions gère tout automatiquement
```

### Étape 5 : Adapter les méthodes de rollback

```typescript
// Avant - rollback manuel
async rejectProposal(id: string) {
    const backup = this.backupContents.get(filePath);
    await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
}

// Après - utiliser le TransactionManager
async rejectProposal(id: string) {
    // Pas besoin de rollback manuel
    // La transaction n'est simplement pas créée
    proposal.status = 'rejected';
}
```

---

## 🧪 Mise à jour des tests

### Tests unitaires

```typescript
// Avant
test('should add proposal', () => {
    proposalManager.addProposal(proposal);
    assert.strictEqual(proposalManager.getPendingProposals().length, 1);
});

// Après
test('should add proposal', async () => {
    await proposalManager.addProposal(proposal);
    assert.strictEqual(proposalManager.getPendingProposals().length, 1);
});
```

### Mocks requis

```typescript
// Ajouter ces mocks pour les tests
const mockTextModelService = {
    createModelReference: () => ({
        object: {
            textEditorModel: mockTextModel
        },
        dispose: () => {}
    })
} as any as ITextModelService;

const mockUndoRedoService = {
    pushElement: () => {}
} as any as IUndoRedoService;

const mockTextModel = {
    getVersionId: () => 1,
    getValue: () => 'content',
    pushEditOperations: () => {},
    getLineCount: () => 10,
    getLineMaxColumn: (line) => 100,
    getFullModelRange: () => new Range(1, 1, 10, 100)
};
```

---

## 📊 Checklist de migration

- [ ] ✅ Imports mis à jour (`ITextModelService`, `IUndoRedoService`)
- [ ] ✅ Constructeurs mis à jour avec les nouveaux services
- [ ] ✅ Tous les appels à `addProposal()` sont async
- [ ] ✅ Try/catch ajoutés pour gérer les erreurs de validation
- [ ] ✅ `backupContents` supprimé
- [ ] ✅ Tests mis à jour avec async/await
- [ ] ✅ Mocks mis à jour pour les tests
- [ ] ✅ Rollback manuel remplacé par `TransactionManager`
- [ ] ✅ Code compilé sans erreur TypeScript
- [ ] ✅ Tests unitaires passent
- [ ] ✅ Tests d'intégration passent

---

## 🔍 Vérification post-migration

### Build
```bash
npm run compile
# Vérifier qu'il n'y a aucune erreur TypeScript
```

### Tests
```bash
npm test -- proposalManager
npm test -- transactionManager
npm test -- proposalWorkflow
```

### Linting
```bash
npm run lint
```

---

## 🆘 Problèmes courants et solutions

### Problème 1 : `Property 'addProposal' does not exist`

**Cause :** Import incorrect de `ProposalManager`.

**Solution :**
```typescript
// Vérifier l'import
import { ProposalManager } from './proposalManager.js';
```

---

### Problème 2 : `Cannot read property 'createModelReference' of undefined`

**Cause :** `ITextModelService` non injecté.

**Solution :**
```typescript
// Ajouter dans le constructeur
constructor(
    @ITextModelService private readonly textModelService: ITextModelService
)
```

---

### Problème 3 : Tests échouent avec "Model not found"

**Cause :** Mock `ITextModelService` incomplet.

**Solution :**
```typescript
const mockTextModelService = {
    createModelReference: () => Promise.resolve({
        object: {
            textEditorModel: mockTextModel
        },
        dispose: () => {}
    })
};
```

---

### Problème 4 : Erreur "Invalid file path"

**Cause :** Chemin pointe vers un dossier ou fichier inexistant.

**Solution :**
```typescript
// Valider le chemin avant de créer la proposition
const uri = URI.file(filePath);
const stat = await fileService.stat(uri);

if (stat.type === FileType.File) {
    await proposalManager.addProposal(proposal);
}
```

---

## 📚 Ressources supplémentaires

- **Documentation technique :** [DIFF_ASSISTANT_2.0.md](DIFF_ASSISTANT_2.0.md)
- **Tests de référence :** [transactionManager.test.ts](src/vs/workbench/contrib/alphacode/test/browser/transactionManager.test.ts)
- **QA Checklist :** [QA_CHECKLIST_DIFF_ASSISTANT_2.0.md](QA_CHECKLIST_DIFF_ASSISTANT_2.0.md)

---

## 💬 Support

Pour toute question sur la migration :
- Ouvrir une issue sur GitHub
- Contacter l'équipe AlphaCode
- Consulter la documentation technique

---

**Dernière mise à jour :** Octobre 2025
**Version :** 2.0

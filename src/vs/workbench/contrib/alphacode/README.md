# AlphaCode - Assistant IA pour VSCode

## 📖 Vue d'ensemble

AlphaCode est un assistant de développement IA intégré à VSCode, offrant des fonctionnalités de chat, de génération de code, et de gestion intelligente des propositions d'édition.

---

## 🗂️ Structure du projet

```
alphacode/
├── browser/                    # Code UI et services principaux
│   ├── transactionManager.ts  # Gestion des transactions (v2.0)
│   ├── proposalUndoElement.ts # Éléments undo/redo (v2.0)
│   ├── proposalManager.ts     # Gestion des propositions
│   ├── proposalsView.ts       # Vue de validation
│   ├── proposalEditorService.ts # Décorations éditeur
│   ├── chatServiceImpl.ts     # Service de chat
│   ├── chatTools.ts           # Outils IA
│   ├── diffUtils.ts           # Utilitaires de diff
│   └── media/                 # Styles CSS
│       ├── proposalsView.css
│       └── proposalDecorations.css
├── common/                     # Interfaces et types
│   ├── chatService.ts         # Interfaces IAlphaCodeChatService
│   ├── aiService.ts           # Interfaces IA
│   └── contextService.ts      # Service de contexte
├── test/                       # Tests
│   └── browser/
│       ├── transactionManager.test.ts
│       └── proposalWorkflow.test.ts
└── DIFF_ASSISTANT_2.0.md      # Documentation technique
```

---

## 🚀 Fonctionnalités principales

### 1. Chat avec IA
- Conversations multi-tours avec historique
- Support des outils (edit, read, write, etc.)
- Streaming des réponses en temps réel
- Gestion du contexte intelligent

### 2. Propositions d'édition (Diff Assistant 2.0)
- ✨ **Contrôle chunk-par-chunk** : Acceptez/rejetez chaque modification individuellement
- ✨ **Rollback transactionnel** : Annulation complète ou partielle avec Ctrl+Z natif
- ✨ **Validation de chemin** : Protection contre les erreurs de chemin
- ✨ **Synchronisation temps réel** : Vue et éditeur toujours synchronisés

### 3. Décorations dans l'éditeur
- Décorations inline style Git (rouge/vert)
- Widgets hover avec boutons Accept/Reject
- Support thème clair/sombre

---

## 📚 Documentation

### Guides principaux

- **[DIFF_ASSISTANT_2.0.md](DIFF_ASSISTANT_2.0.md)** : Guide technique complet du Diff Assistant 2.0
- **[MIGRATION_GUIDE](../../../../../MIGRATION_GUIDE_DIFF_ASSISTANT_2.0.md)** : Guide de migration v1 → v2
- **[IMPLEMENTATION_SUMMARY](../../../../../IMPLEMENTATION_SUMMARY.md)** : Récapitulatif de l'implémentation

### Checklist et release

- **[QA_CHECKLIST](../../../../../QA_CHECKLIST_DIFF_ASSISTANT_2.0.md)** : Tests de validation
- **[RELEASE_NOTES](../../../../../RELEASE_NOTES_DIFF_ASSISTANT_2.0.md)** : Notes de version 2.0
- **[DELIVERABLES_SUMMARY](../../../../../DELIVERABLES_SUMMARY.md)** : Livrables du projet

---

## 🛠️ Développement

### Installation

```bash
# Installer les dépendances
npm install

# Compiler le projet
npm run compile

# Lancer les tests
npm test -- alphacode
```

### Architecture

#### Services principaux

##### `IAlphaCodeChatService`
Service de chat principal.

```typescript
interface IAlphaCodeChatService {
    sendMessage(content: string, context?: IChatContext): Promise<void>;
    acceptProposal(proposalId: string): Promise<void>;
    rejectProposal(proposalId: string): Promise<void>;
    getPendingProposals(): IEditProposalWithChanges[];
}
```

##### `TransactionManager` (v2.0)
Gestionnaire de transactions pour les propositions.

```typescript
class TransactionManager {
    async applyProposal(proposal: IEditProposalWithChanges, chunkIndexes: number[]): Promise<IProposalTransaction>;
    async rollback(transactionId: string): Promise<void>;
    async rollbackFile(filePath: string): Promise<void>;
    getFileTransactions(filePath: string): IProposalTransaction[];
}
```

##### `ProposalManager`
Gestionnaire de propositions d'édition.

```typescript
class ProposalManager {
    async addProposal(proposal: IEditProposalWithChanges): Promise<void>;
    async acceptProposal(id: string): Promise<string>;
    async rejectProposal(id: string): Promise<string>;
    async applyPartialChanges(proposal: IEditProposalWithChanges, changeIndexes: number[], accept: boolean): Promise<void>;
}
```

---

## 🧪 Tests

### Exécuter les tests

```bash
# Tests unitaires
npm test -- transactionManager

# Tests d'intégration
npm test -- proposalWorkflow

# Tous les tests alphacode
npm test -- alphacode
```

### Écrire des tests

```typescript
import * as assert from 'assert';
import { TransactionManager } from '../../browser/transactionManager.js';

suite('TransactionManager', () => {
    test('should create transaction', async () => {
        const manager = new TransactionManager(mockTextModelService, mockUndoRedoService);
        // Test code...
    });
});
```

---

## 🎨 Styles et UI

### Variables CSS

Les composants utilisent les variables CSS de VSCode :

```css
var(--vscode-editor-background)
var(--vscode-panel-border)
var(--vscode-focusBorder)
var(--vscode-foreground)
```

### Thèmes

Support complet des thèmes VSCode :
- Thème clair
- Thème sombre
- High contrast

---

## 🔧 Configuration

### Enregistrement des services

Les services AlphaCode sont enregistrés dans `alphacode.contribution.ts` :

```typescript
registerSingleton(IAlphaCodeChatService, AlphaCodeChatService, InstantiationType.Delayed);
```

### Contributions

- **Views** : Vue de chat et vue de propositions
- **Commands** : Commandes pour interagir avec l'IA
- **Keybindings** : Raccourcis clavier

---

## 📊 Monitoring et métriques

### Événements

```typescript
// Événements de proposition
onDidCreateProposal: Event<IEditProposalWithChanges>;
onDidChangeProposalStatus: Event<IEditProposalWithChanges>;

// Événements de chat
onDidAddMessage: Event<IChatMessage>;
onDidStreamChunk: Event<IStreamChunk>;
```

### Métriques à surveiller

- Taux d'acceptation des propositions (cible : >70%)
- MTTR rollback (cible : <30s)
- Nombre de chunks par proposition
- Temps d'application des transactions

---

## 🐛 Debugging

### Logs

```typescript
console.log('[AlphaCode]', message);
```

### Breakpoints utiles

- `proposalManager.ts:103` : Acceptation de proposition
- `transactionManager.ts:45` : Application de transaction
- `proposalsView.ts:287` : Action sur chunk

### DevTools

```typescript
// Dans la console DevTools
window.alphacode = {
    manager: proposalManager,
    transactions: transactionManager
};
```

---

## 🚢 Déploiement

### Checklist pre-release

- [ ] Tests unitaires au vert
- [ ] Tests d'intégration au vert
- [ ] QA validée
- [ ] Documentation à jour
- [ ] Migrations documentées
- [ ] Release notes rédigées

### Build de production

```bash
npm run compile:production
```

---

## 🤝 Contribution

### Workflow

1. Créer une branche feature
2. Implémenter les changements
3. Ajouter des tests
4. Mettre à jour la documentation
5. Créer une Pull Request

### Standards de code

- TypeScript strict mode
- ESLint + Prettier
- 100% des fonctions publiques documentées
- Tests pour les nouvelles fonctionnalités

---

## 🔗 Liens utiles

- **Repository :** [GitHub](https://github.com/...)
- **Issues :** [GitHub Issues](https://github.com/.../issues)
- **Wiki :** [Documentation complète](https://wiki....)
- **Roadmap :** [roadmap.md](../../../../../roadmap.md)

---

## 📞 Support

- **Email :** alphacode-support@company.com
- **Slack :** #alphacode-dev
- **Teams :** AlphaCode Development

---

## 📜 Licence

MIT License - Voir [LICENSE.txt](../../../../../LICENSE.txt)

---

**Version :** 2.0.0
**Dernière mise à jour :** 9 octobre 2025

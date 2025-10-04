# Système d'Outils AI avec Validation Diff

## Vue d'ensemble

Le système d'outils AI d'AlphaCode permet à l'intelligence artificielle d'effectuer des opérations sur le système de fichiers avec validation utilisateur en temps réel. Les modifications proposées par l'IA sont affichées dans un éditeur diff avant d'être appliquées.

## Fonctionnement

### 1. Détection en Streaming

Lorsque l'IA génère une réponse, le système détecte automatiquement les appels d'outils **en temps réel** pendant le streaming, sans attendre la fin du message complet.

```typescript
// Format d'un outil dans la réponse de l'IA :
```tool
{
  "name": "write_file",
  "parameters": {
    "path": "src/example.ts",
    "content": "export function hello() {\n  console.log('Hello!');\n}"
  }
}
```
```

### 2. Exécution Immédiate

Dès qu'un bloc d'outil est complet, il est exécuté automatiquement :
- **Sans attendre** la fin du message de l'IA
- **En parallèle** si plusieurs outils sont détectés
- **Avec logging** dans la console pour le debugging

```typescript
console.log('[AlphaCode] Tool detected during streaming:', toolCall.name);
```

### 3. Ouverture de la Diff

Pour les outils d'écriture (`write_file`, `edit_file`), une vue diff s'ouvre automatiquement :

- **Panneau gauche** : Contenu original (rouge pour suppressions)
- **Panneau droit** : Contenu proposé (vert pour ajouts)
- **Description** : Nombre de changements détectés
- **Focus** : L'éditeur prend automatiquement le focus

### 4. Validation Utilisateur

L'utilisateur peut alors :

#### Accepter les modifications
```typescript
await chatService.acceptProposal(proposalId);
// ✓ Applique les changements au fichier
// ✓ Supprime le backup
// ✓ Log la décision dans l'audit
```

#### Rejeter les modifications
```typescript
await chatService.rejectProposal(proposalId);
// ✗ Effectue un rollback vers le contenu original
// ✗ Restaure le fichier s'il a été modifié
// ✗ Log la décision dans l'audit
```

### 5. Système de Rollback

Chaque proposition garde une sauvegarde du contenu original :

```typescript
private backupContents: Map<string, string> = new Map();

// Lors de la création d'une proposition
this.backupContents.set(proposalId, originalContent);

// Lors du rejet
if (backup !== undefined) {
  await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
  console.log('[AlphaCode] Rolled back changes');
}
```

## Outils Disponibles

### Outils d'Écriture (avec diff)

#### `write_file`
Crée un nouveau fichier ou écrase un fichier existant.
- Ouvre une diff view
- Nécessite validation utilisateur
- Supporte le rollback

#### `edit_file`
Édite un fichier en remplaçant du texte spécifique.
- Ouvre une diff view
- Nécessite validation utilisateur
- Supporte le rollback

### Outils de Lecture (sans diff)

#### `read_file`
Lit le contenu d'un fichier.
- Exécution immédiate
- Pas de validation requise

#### `list_directory`
Liste les fichiers d'un répertoire.

#### `search_files`
Recherche des fichiers par pattern.

#### `get_file_info`
Obtient les métadonnées d'un fichier.

#### `delete_file`
Supprime un fichier (attention !).

## Flow Complet

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur envoie un message                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. IA génère une réponse en streaming                       │
│    "Je vais créer un fichier..."                            │
│    ```tool                                                   │
│    { "name": "write_file", ... }                             │
│    ```                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Système détecte l'outil complet en temps réel            │
│    [AlphaCode] Tool detected: write_file                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Outil exécuté IMMÉDIATEMENT (sans attendre fin message)  │
│    - Calcul des changements ligne par ligne                 │
│    - Création d'une proposition avec backup                 │
│    - Ouverture de la diff view                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Éditeur diff s'ouvre automatiquement                     │
│    ┌──────────────────┬──────────────────┐                  │
│    │ Original (rouge) │ Proposé (vert)   │                  │
│    │                  │ + nouveau code   │                  │
│    └──────────────────┴──────────────────┘                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Utilisateur valide dans le chat ou la ProposalsView      │
│    ┌──────────┐  ┌──────────┐                               │
│    │ Accept   │  │ Reject   │                               │
│    └────┬─────┘  └────┬─────┘                               │
│         │             │                                      │
│         ▼             ▼                                      │
│    ✓ Appliqué    ✗ Rollback                                 │
└─────────────────────────────────────────────────────────────┘
```

## Debug et Logging

Le système log chaque étape importante :

```typescript
// Détection d'outil
console.log('[AlphaCode] Tool detected during streaming:', toolCall.name);

// Création de proposition
console.log('[AlphaCode] Creating edit proposal:', id, 'for', path);
console.log('[AlphaCode] Changes detected:', changes.length);

// Ouverture de diff
console.log('[AlphaCode] Opening diff editor for proposal:', id);
console.log('[AlphaCode] Diff editor opened successfully:', editor ? 'yes' : 'no');

// Acceptation
console.log('[AlphaCode] Accepting proposal:', id);

// Rejet avec rollback
console.log('[AlphaCode] Rejecting proposal:', id);
console.log('[AlphaCode] Rolled back changes for:', path);
```

## Audit Log

Toutes les décisions sont enregistrées :

```typescript
interface IToolEditDecisionRecord {
  id: string;          // ID de la proposition
  path: string;        // Chemin du fichier
  action: "accepted" | "rejected" | "partially-accepted";
  timestamp: number;   // Horodatage
}

// Accès au log
const auditLog = chatService.getProposalAuditLog();
```

## Contrôle Granulaire

Le système supporte également le contrôle granulaire ligne par ligne :

```typescript
// Accepter seulement certains changements
await chatService.applyProposalDecision({
  proposalId: 'proposal-1',
  action: 'accept-changes',
  changeIndexes: [0, 2, 5] // Accepte seulement les changements 0, 2 et 5
});

// Rejeter certains changements (garde le reste pending)
await chatService.applyProposalDecision({
  proposalId: 'proposal-1',
  action: 'reject-changes',
  changeIndexes: [1, 3] // Rejette les changements 1 et 3
});
```

## Configuration du Prompt Système

Le prompt système informe l'IA du comportement :

```
## Available Tools

You have access to powerful tools to help users. When you use a tool, 
it will be executed IMMEDIATELY in real-time as you write it. For file 
editing tools (write_file, edit_file), a diff view will automatically 
open for the user to review your changes.

**IMPORTANT**: 
- The tool block will be executed as soon as it's complete 
  (you don't need to finish your entire message)
- For write_file and edit_file tools, a diff editor will open 
  automatically showing changes in red (deletions) and green (additions)
- The user can accept or reject changes from the diff view
```

## Visualisation des Couleurs

L'éditeur diff de VS Code gère automatiquement les couleurs :
- **Rouge** : Lignes supprimées (dans le panneau original)
- **Vert** : Lignes ajoutées (dans le panneau modifié)
- **Bleu** : Lignes modifiées (combinaison de rouge/vert)

Aucune configuration supplémentaire n'est nécessaire, c'est natif à VS Code.

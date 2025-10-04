# Système d'Attache de Fichiers AlphaCode

## Vue d'ensemble

Le système d'attache de fichiers permet aux utilisateurs d'envoyer un ou plusieurs fichiers au sein d'une conversation AlphaCode Chat. Cette fonctionnalité facilite le partage de contexte, de documents et de ressources avec l'assistant IA.

## Fonctionnalités

### ✨ Principales fonctionnalités

- **Upload de fichiers multiples** : Attachez jusqu'à 5 fichiers par message
- **Glisser-déposer** : Interface intuitive de drag & drop
- **Prévisualisation d'images** : Affichage des miniatures pour les fichiers image
- **Validation de sécurité** : Vérification des types de fichiers et tailles
- **Scan de sécurité** : Support pour l'analyse antivirus (optionnel)
- **Chiffrement** : Protection des données en transit
- **Gestion intelligente** : Stockage sécurisé avec métadonnées

## Types de Fichiers Supportés

### 📄 Documents
- **PDF** (`.pdf`) - Documents Adobe
- **Texte** (`.txt`) - Fichiers texte brut
- **Markdown** (`.md`) - Documentation formatée

### 🖼️ Images
- **PNG** (`.png`) - Images PNG
- **JPEG** (`.jpg`, `.jpeg`) - Images JPEG
- **GIF** (`.gif`) - Images GIF animées ou statiques
- **WebP** (`.webp`) - Format WebP
- **SVG** (`.svg`) - Graphiques vectoriels

### 💻 Code et Données
- **JSON** (`.json`) - Données structurées JSON
- **XML** (`.xml`) - Documents XML
- **CSV** (`.csv`) - Données tabulaires

### 📦 Archives
- **ZIP** (`.zip`) - Archives compressées (limitées)

## Limitations de Sécurité

### ⚠️ Restrictions

- **Taille maximale** : 10 MB par fichier
- **Nombre maximum** : 5 fichiers par message
- **Extensions bloquées** : `.exe`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.scr`, `.com`, `.pif`

### 🔒 Mesures de sécurité

1. **Validation de type MIME** : Vérification du type de contenu réel
2. **Scan de nom de fichier** : Détection de caractères dangereux
3. **Calcul de hash** : Vérification d'intégrité (SHA-256)
4. **Scan antivirus** : Analyse optionnelle des fichiers
5. **Chiffrement** : Protection des données en transit

## Guide d'Utilisation

### 📎 Attacher des fichiers

#### Méthode 1 : Bouton d'attache

1. Cliquez sur le bouton **📎 Attach** dans la zone de saisie
2. Sélectionnez un ou plusieurs fichiers dans la boîte de dialogue
3. Les fichiers s'affichent dans la liste des pièces jointes
4. Tapez votre message et envoyez

#### Méthode 2 : Glisser-déposer

1. Faites glisser vos fichiers depuis l'explorateur
2. Déposez-les dans la zone de chat AlphaCode
3. Les fichiers sont automatiquement validés et uploadés
4. Rédigez votre message et envoyez

### 📋 Gestion des fichiers attachés

#### Visualiser les fichiers

- Les fichiers attachés apparaissent sous votre message
- Les images affichent une miniature de prévisualisation
- Les autres fichiers montrent une icône selon le type

#### Supprimer un fichier

1. Cliquez sur l'icône **🗑️** à côté du fichier
2. Le fichier est immédiatement retiré de la liste
3. Il ne sera pas envoyé avec le message

#### Informations affichées

Pour chaque fichier :
- **Nom** : Nom complet du fichier
- **Taille** : Taille formatée (KB/MB)
- **Statut** : État du scan de sécurité
  - ✓ Sécurisé : Fichier validé
  - ⏳ Scan... : Analyse en cours
  - ⚠️ Infecté : Fichier bloqué
  - ⚠️ Erreur scan : Erreur lors de l'analyse

### 🔄 Processus d'upload

1. **Sélection** : Choisir les fichiers
2. **Validation** : Vérification des restrictions
3. **Upload** : Transfert vers le stockage
   - Barre de progression affichée
   - Statut "Upload en cours..."
4. **Traitement** : Génération des métadonnées
   - Calcul du hash
   - Création de miniatures (images)
   - Scan de sécurité
5. **Confirmation** : Fichier prêt à être envoyé

### ⚠️ Gestion des erreurs

Les messages d'erreur suivants peuvent apparaître :

| Erreur | Cause | Solution |
|--------|-------|----------|
| Fichier trop volumineux | Dépasse 10 MB | Compresser ou diviser le fichier |
| Type non supporté | Extension non autorisée | Convertir dans un format supporté |
| Trop de fichiers | Plus de 5 fichiers | Envoyer en plusieurs messages |
| Extension bloquée | Fichier potentiellement dangereux | Ne pas envoyer ce type de fichier |
| Erreur d'upload | Problème réseau/serveur | Réessayer plus tard |

## Configuration

### ⚙️ Configuration de sécurité

Le service de fichiers peut être configuré via `IFileAttachmentSecurityConfig` :

```typescript
interface IFileAttachmentSecurityConfig {
    // Taille maximale en octets (défaut: 10MB)
    maxFileSize: number;
    
    // Nombre maximum de fichiers par message (défaut: 5)
    maxFilesPerMessage: number;
    
    // Types MIME autorisés
    allowedMimeTypes: string[];
    
    // Extensions bloquées
    blockedExtensions: string[];
    
    // Activer le scan antivirus
    enableAntivirusScan: boolean;
    
    // Chiffrement requis
    requireEncryption: boolean;
}
```

### 🔧 Modifier la configuration

Les administrateurs peuvent ajuster la configuration :

```typescript
// Exemple : Augmenter la taille maximale à 20 MB
fileAttachmentService.updateSecurityConfig({
    maxFileSize: 20 * 1024 * 1024
});

// Exemple : Autoriser plus de fichiers
fileAttachmentService.updateSecurityConfig({
    maxFilesPerMessage: 10
});
```

## Stockage

### 📁 Emplacement des fichiers

Les fichiers sont stockés dans :
- **Windows** : `%APPDATA%/.alphacode/attachments/`
- **macOS/Linux** : `~/.alphacode/attachments/`

### 🗄️ Structure des métadonnées

Chaque fichier possède :
- **ID unique** : Identifiant généré automatiquement
- **Nom original** : Nom du fichier uploadé
- **Type MIME** : Type de contenu
- **Taille** : En octets
- **Hash** : Empreinte SHA-256
- **Horodatage** : Date/heure d'upload
- **Statut scan** : Résultat de l'analyse de sécurité

### 🧹 Nettoyage automatique

Le système peut nettoyer les fichiers orphelins :

```typescript
// Nombre de fichiers nettoyés
const cleaned = await fileAttachmentService.cleanupOrphanedFiles();
```

## API pour Développeurs

### 🔌 Service d'attache de fichiers

#### Upload d'un fichier

```typescript
const attachment = await fileAttachmentService.uploadFile(file, messageId);
```

#### Upload de plusieurs fichiers

```typescript
const attachments = await fileAttachmentService.uploadFiles(files, messageId);
```

#### Récupérer un fichier

```typescript
const attachment = await fileAttachmentService.getFile(fileId);
```

#### Récupérer les fichiers d'un message

```typescript
const attachments = await fileAttachmentService.getFilesByMessage(messageId);
```

#### Supprimer un fichier

```typescript
await fileAttachmentService.deleteFile(fileId);
```

#### Valider un fichier

```typescript
const validation = await fileAttachmentService.validateFile(file);
if (!validation.valid) {
    console.error(validation.errors);
}
```

### 📊 Statistiques d'utilisation

```typescript
const stats = await fileAttachmentService.getUsageStats();
console.log(`Total de fichiers: ${stats.totalFiles}`);
console.log(`Taille totale: ${stats.totalSize} octets`);
console.log(`Par type:`, stats.filesByType);
```

### 🎯 Événements

Le service émet des événements :

```typescript
// Upload de fichier
fileAttachmentService.onDidUploadFile((event) => {
    console.log(`Upload: ${event.fileName} - ${event.progress}%`);
});

// Suppression de fichier
fileAttachmentService.onDidDeleteFile((fileId) => {
    console.log(`Fichier supprimé: ${fileId}`);
});
```

## Bonnes Pratiques

### ✅ Recommandations

1. **Optimiser la taille** : Compresser les images avant upload
2. **Nommer clairement** : Utiliser des noms descriptifs
3. **Vérifier les types** : S'assurer que le format est supporté
4. **Sécurité** : Ne jamais envoyer de fichiers exécutables
5. **Organisation** : Grouper les fichiers liés dans un même message

### 🚫 À éviter

1. Envoyer des fichiers trop volumineux (>10 MB)
2. Attacher des fichiers non pertinents
3. Utiliser des noms de fichiers avec caractères spéciaux
4. Envoyer des archives sans vérifier leur contenu
5. Partager des fichiers contenant des données sensibles

## Dépannage

### ❓ Problèmes courants

#### Le fichier ne s'upload pas

1. Vérifiez la taille du fichier (max 10 MB)
2. Vérifiez le type de fichier (voir liste des types supportés)
3. Vérifiez votre connexion réseau
4. Réessayez l'opération

#### L'image ne s'affiche pas

1. Vérifiez que c'est un format image supporté
2. Le fichier peut être corrompu
3. Essayez de le réouvrir dans un éditeur d'images

#### Message d'erreur "Extension bloquée"

1. Le type de fichier est considéré comme dangereux
2. Convertissez le fichier dans un format autorisé
3. Si nécessaire, contactez l'administrateur système

## Support

Pour toute question ou problème :

- **Documentation** : Consultez cette documentation
- **Issues** : Signalez les bugs sur GitHub
- **Support** : Contactez l'équipe AlphaCode

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025  
**Auteur** : Équipe AlphaCode

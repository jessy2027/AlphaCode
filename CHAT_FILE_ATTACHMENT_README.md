# Chat File Attachment System - Documentation

## Vue d'ensemble

Le système d'attachement de fichiers pour AlphaCode Chat permet aux utilisateurs d'envoyer un ou plusieurs fichiers au sein d'une conversation de manière sécurisée et efficace.

## Fonctionnalités principales

### ✅ Upload sécurisé
- **Validation des types de fichiers** : Contrôle strict des formats autorisés
- **Limites de taille** : Configuration flexible des tailles maximales
- **Scan antivirus** : Détection de contenu malveillant
- **Chiffrement en transit** : Protection des données pendant l'upload

### ✅ Interface utilisateur intuitive
- **Drag & Drop** : Glisser-déposer des fichiers directement
- **Bouton d'upload** : Interface classique de sélection de fichiers
- **Barre de progression** : Suivi en temps réel de l'upload
- **Validation visuelle** : Feedback immédiat sur les erreurs

### ✅ Stockage et métadonnées
- **Stockage sécurisé** : Chiffrement et compression des fichiers
- **Métadonnées enrichies** : Informations détaillées sur chaque fichier
- **Gestion des quotas** : Contrôle de l'espace utilisé
- **Nettoyage automatique** : Suppression des fichiers expirés

## Architecture

### Composants principaux

```
ChatEnhancedFileAttachment (Composant principal)
├── ChatFileUploadWidget (Interface d'upload)
├── ChatFileValidationWidget (Affichage des validations)
├── ChatEnhancedAttachmentManager (Gestion des attachements)
├── ChatFileUploadService (Service d'upload)
├── ChatFileValidationService (Service de validation)
└── ChatFileStorageService (Service de stockage)
```

### Services

1. **ChatFileUploadService** : Gère l'upload sécurisé des fichiers
2. **ChatFileValidationService** : Valide les fichiers selon des règles configurables
3. **ChatFileStorageService** : Stocke et récupère les fichiers avec métadonnées

## Configuration

### Paramètres principaux

```json
{
  "chat.fileAttachment.enabled": true,
  "chat.fileAttachment.maxFileSize": 52428800,
  "chat.fileAttachment.maxFileCount": 10,
  "chat.fileAttachment.maxTotalSize": 209715200,
  "chat.fileAttachment.enableValidation": true,
  "chat.fileAttachment.enableVirusScan": true,
  "chat.fileAttachment.enableEncryption": true,
  "chat.fileAttachment.retentionDays": 30
}
```

### Types de fichiers supportés

Par défaut, les types suivants sont autorisés :
- **Documents** : `.txt`, `.md`, `.pdf`, `.doc`, `.docx`, `.rtf`
- **Images** : `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`
- **Code** : `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.c`, `.cs`, `.php`, `.rb`, `.go`, `.rs`
- **Données** : `.json`, `.xml`, `.yaml`, `.yml`, `.csv`, `.xlsx`, `.xls`

### Types de fichiers bloqués

Pour des raisons de sécurité :
- **Exécutables** : `.exe`, `.bat`, `.cmd`, `.com`, `.scr`
- **Scripts** : `.vbs`, `.ps1`, `.sh`
- **Archives suspectes** : Certains formats d'archives

## Utilisation

### Intégration dans le chat

```typescript
import { ChatEnhancedFileAttachment } from './chatEnhancedFileAttachment.js';

// Créer le composant d'attachement
const fileAttachment = instantiationService.createInstance(
  ChatEnhancedFileAttachment,
  parentElement,
  attachmentModel,
  {
    allowMultiple: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFileCount: 10,
    enableValidation: true,
    enableDragDrop: true,
    showUploadProgress: true
  }
);

// Écouter les événements
fileAttachment.onAttachmentsChanged(event => {
  console.log('Attachments changed:', event);
});

fileAttachment.onValidationStateChanged(event => {
  if (!event.valid) {
    console.error('Validation errors:', event.errors);
  }
});
```

### API publique

```typescript
// Obtenir tous les attachements
const attachments = fileAttachment.getAttachments();

// Obtenir les attachements avec métadonnées
const enhancedAttachments = fileAttachment.getEnhancedAttachments();

// Supprimer un attachement
await fileAttachment.removeAttachment(attachmentId);

// Nettoyer tous les attachements
await fileAttachment.clearAllAttachments();

// Obtenir les statistiques
const stats = fileAttachment.getAttachmentStats();

// Valider tous les attachements
const validation = await fileAttachment.validateAllAttachments();
```

## Validation des fichiers

### Règles de validation par défaut

1. **Taille de fichier** : Vérifie que la taille ne dépasse pas les limites
2. **Type de fichier** : Contrôle les extensions et types MIME autorisés
3. **Nom de fichier** : Valide le format du nom (caractères autorisés)
4. **Scan malware** : Détecte les contenus potentiellement dangereux
5. **Intégrité** : Vérifie l'intégrité du fichier

### Règles personnalisées

```typescript
// Ajouter une règle personnalisée
validationService.addCustomRule({
  id: 'custom-rule',
  name: 'Custom Validation Rule',
  description: 'Custom validation logic',
  severity: 'warning',
  enabled: true,
  validate: async (file: File) => {
    // Logique de validation personnalisée
    return {
      valid: true,
      severity: 'info',
      message: 'Custom validation passed',
      code: 'CUSTOM_OK'
    };
  }
});
```

## Sécurité

### Mesures de sécurité implémentées

1. **Validation stricte des types** : Contrôle des extensions et types MIME
2. **Scan antivirus basique** : Détection de patterns suspects
3. **Limites de taille** : Protection contre les attaques par déni de service
4. **Chiffrement** : Protection des données stockées
5. **Audit** : Journalisation des opérations sur les fichiers

### Bonnes pratiques

- Configurez des limites de taille appropriées
- Activez toujours la validation et le scan antivirus
- Utilisez le chiffrement pour les données sensibles
- Surveillez les quotas de stockage
- Nettoyez régulièrement les fichiers expirés

## Gestion des erreurs

### Types d'erreurs courantes

1. **Fichier trop volumineux** : `FILE_SIZE_EXCEEDED`
2. **Type non supporté** : `FILE_TYPE_NOT_SUPPORTED`
3. **Nom invalide** : `FILE_NAME_INVALID`
4. **Contenu suspect** : `SUSPICIOUS_CONTENT`
5. **Quota dépassé** : `QUOTA_EXCEEDED`

### Gestion des erreurs

```typescript
fileAttachment.onValidationStateChanged(event => {
  if (!event.valid) {
    event.errors.forEach(error => {
      switch (error) {
        case 'FILE_SIZE_EXCEEDED':
          // Afficher message d'erreur de taille
          break;
        case 'FILE_TYPE_NOT_SUPPORTED':
          // Afficher liste des types supportés
          break;
        // ... autres cas
      }
    });
  }
});
```

## Performance

### Optimisations implémentées

1. **Upload asynchrone** : Traitement non-bloquant
2. **Compression** : Réduction de la taille des fichiers stockés
3. **Déduplication** : Évite le stockage de doublons
4. **Cache des métadonnées** : Accès rapide aux informations
5. **Nettoyage automatique** : Libération d'espace

### Recommandations

- Limitez le nombre de fichiers simultanés
- Utilisez la compression pour les gros fichiers
- Configurez un nettoyage automatique régulier
- Surveillez l'utilisation du stockage

## Accessibilité

### Fonctionnalités d'accessibilité

1. **Navigation au clavier** : Support complet du clavier
2. **Lecteurs d'écran** : Labels et descriptions appropriés
3. **Contrastes élevés** : Respect des standards d'accessibilité
4. **Messages d'erreur clairs** : Feedback compréhensible
5. **Indicateurs visuels** : États clairement identifiables

## Tests

### Exécution des tests

```bash
# Tests unitaires
npm test -- --grep "Chat File Attachment"

# Tests d'intégration
npm run test:integration -- --grep "file attachment"

# Tests de performance
npm run test:perf -- --grep "file upload"
```

### Couverture de tests

- ✅ Validation des fichiers
- ✅ Upload sécurisé
- ✅ Stockage et récupération
- ✅ Gestion des erreurs
- ✅ Intégration complète

## Dépannage

### Problèmes courants

1. **Upload qui échoue**
   - Vérifiez la taille du fichier
   - Contrôlez le type de fichier
   - Vérifiez les quotas disponibles

2. **Validation qui échoue**
   - Consultez les règles de validation actives
   - Vérifiez la configuration des types autorisés
   - Examinez les logs de validation

3. **Fichiers non trouvés**
   - Vérifiez la politique de rétention
   - Contrôlez l'intégrité du stockage
   - Examinez les logs de nettoyage

### Logs et débogage

```typescript
// Activer les logs détaillés
configurationService.updateValue('chat.fileAttachment.enableAuditLog', true);

// Consulter les statistiques
const stats = fileAttachment.getAttachmentStats();
console.log('Attachment stats:', stats);

// Vérifier la validation
const validation = await fileAttachment.validateAllAttachments();
console.log('Validation result:', validation);
```

## Roadmap

### Améliorations prévues

1. **Support de nouveaux formats** : Ajout de types de fichiers supplémentaires
2. **Prévisualisation** : Aperçu des fichiers avant envoi
3. **Synchronisation cloud** : Stockage dans le cloud
4. **Collaboration** : Partage de fichiers entre utilisateurs
5. **API REST** : Interface pour intégrations externes

### Contributions

Pour contribuer au développement :

1. Consultez les issues ouvertes
2. Proposez de nouvelles fonctionnalités
3. Soumettez des pull requests
4. Améliorez la documentation
5. Signalez les bugs

## Support

Pour obtenir de l'aide :

- Consultez cette documentation
- Examinez les tests pour des exemples d'utilisation
- Ouvrez une issue sur le repository
- Contactez l'équipe de développement

---

*Cette documentation est maintenue par l'équipe AlphaCode. Dernière mise à jour : Octobre 2025*

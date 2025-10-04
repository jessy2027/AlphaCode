# Guide de Démarrage Rapide - Attache de Fichiers

## 🚀 Démarrage en 3 minutes

### Pour les Utilisateurs

#### Attacher un fichier en 3 étapes

1. **Ouvrez AlphaCode Chat**
   - Cliquez sur l'icône AlphaCode dans la barre latérale
   - Ou utilisez le raccourci `Ctrl+Alt+A`

2. **Attachez vos fichiers**
   - Cliquez sur le bouton **📎 Attach**
   - Ou glissez-déposez vos fichiers dans la zone de chat

3. **Envoyez votre message**
   - Tapez votre question ou commentaire
   - Appuyez sur **Send** ou `Ctrl+Enter`

#### Exemple d'utilisation

```
Vous : "Peux-tu analyser ce fichier de configuration ?"
[📎 config.json - 2.4 KB - ✓ Sécurisé]

AlphaCode AI : "J'ai analysé votre fichier de configuration..."
```

### Pour les Développeurs

#### Intégration rapide

```typescript
import { IAlphaCodeFileAttachmentService } from '../common/fileAttachmentService.js';

// Injecter le service
constructor(
    @IAlphaCodeFileAttachmentService 
    private readonly fileAttachmentService: IAlphaCodeFileAttachmentService
) {}

// Upload d'un fichier
async uploadFile(file: File, messageId: string) {
    const attachment = await this.fileAttachmentService.uploadFile(file, messageId);
    console.log('Fichier uploadé:', attachment.id);
}

// Récupérer les fichiers d'un message
async getMessageFiles(messageId: string) {
    const files = await this.fileAttachmentService.getFilesByMessage(messageId);
    return files;
}
```

#### Utilisation du Widget

```typescript
import { FileAttachmentWidget } from './fileAttachmentWidget.js';

// Créer le widget
const widget = new FileAttachmentWidget(
    {
        container: containerElement,
        compact: true,
        showDropZone: true
    },
    fileAttachmentService
);

// Écouter les événements
widget.onDidAttachFiles((attachments) => {
    console.log('Fichiers attachés:', attachments);
});

widget.onDidRemoveFile((fileId) => {
    console.log('Fichier supprimé:', fileId);
});
```

## 📋 Checklist de Vérification

### Avant de Commencer

- [ ] AlphaCode est installé et configuré
- [ ] L'IA est connectée (voir paramètres)
- [ ] Vous avez des fichiers à partager (<10 MB chacun)

### Pendant l'Upload

- [ ] Le fichier est dans un format supporté
- [ ] La taille est inférieure à 10 MB
- [ ] Vous n'avez pas plus de 5 fichiers par message
- [ ] Le nom du fichier ne contient pas de caractères spéciaux

### Après l'Upload

- [ ] Le fichier apparaît dans la liste
- [ ] Le statut est "✓ Sécurisé"
- [ ] Vous pouvez voir l'aperçu (pour les images)
- [ ] Le message est envoyé avec succès

## 🎯 Cas d'Usage Rapides

### 1. Partager une capture d'écran

```
1. Prenez une capture d'écran (Windows: Win+Shift+S)
2. Glissez-déposez l'image dans AlphaCode Chat
3. Demandez: "Qu'est-ce qui ne va pas avec cette interface ?"
```

### 2. Analyser un fichier de configuration

```
1. Localisez votre fichier config (JSON, XML, etc.)
2. Cliquez sur 📎 Attach et sélectionnez le fichier
3. Demandez: "Cette configuration est-elle optimale ?"
```

### 3. Obtenir de l'aide sur un document

```
1. Attachez votre document PDF ou Markdown
2. Posez votre question spécifique
3. L'IA analyse le contenu et répond
```

### 4. Déboguer avec des logs

```
1. Exportez vos logs en fichier .txt ou .log
2. Attachez le fichier au chat
3. Demandez: "Peux-tu identifier l'erreur dans ces logs ?"
```

## ⚡ Raccourcis et Astuces

### Raccourcis Clavier

- `Ctrl+Enter` : Envoyer le message
- `Ctrl+V` : Coller une image du presse-papiers (bientôt disponible)
- `Esc` : Fermer la boîte de dialogue de fichiers

### Astuces Pro

1. **Compression d'images** : Utilisez TinyPNG avant d'uploader de grandes images
2. **Noms descriptifs** : Renommez vos fichiers pour plus de clarté
3. **Batch upload** : Sélectionnez plusieurs fichiers d'un coup
4. **Drag & drop** : Plus rapide que le sélecteur de fichiers
5. **Prévisualisation** : Vérifiez toujours l'aperçu avant d'envoyer

## 🔧 Dépannage Rapide

| Problème | Solution Rapide |
|----------|----------------|
| Le bouton Attach ne fonctionne pas | Rechargez AlphaCode (Ctrl+R) |
| Fichier trop volumineux | Compressez ou divisez le fichier |
| Type non supporté | Convertissez en PDF, PNG, ou TXT |
| Upload lent | Vérifiez votre connexion Internet |
| Aperçu ne s'affiche pas | Le fichier peut être corrompu |

## 📚 Ressources Supplémentaires

- [Documentation complète](./FILE_ATTACHMENTS.md)
- [Types de fichiers supportés](./FILE_ATTACHMENTS.md#types-de-fichiers-supportés)
- [Configuration avancée](./FILE_ATTACHMENTS.md#configuration)
- [API développeur](./FILE_ATTACHMENTS.md#api-pour-développeurs)

## 💡 Exemples de Messages

### Avec capture d'écran
```
"Voici une erreur que je rencontre, peux-tu m'aider ?"
📎 error-screenshot.png
```

### Avec fichier de code
```
"Ce fichier JSON est-il valide ?"
📎 package.json
```

### Avec plusieurs fichiers
```
"Compare ces deux configurations et dis-moi laquelle est meilleure"
📎 config-dev.json
📎 config-prod.json
```

## 🎓 Prochaines Étapes

1. Essayez d'attacher votre premier fichier
2. Explorez les différents types de fichiers
3. Testez le glisser-déposer
4. Consultez la documentation complète
5. Partagez vos retours d'expérience

---

**Besoin d'aide ?** Consultez [FILE_ATTACHMENTS.md](./FILE_ATTACHMENTS.md) pour plus de détails.

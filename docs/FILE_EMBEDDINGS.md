# Système d'Embeddings et d'Analyse de Fichiers AlphaCode

## Vue d'ensemble

Le système d'embeddings permet à l'IA AlphaCode de lire, analyser et comprendre le contenu des fichiers attachés aux conversations. Chaque fichier est automatiquement traité pour extraire son contenu textuel et générer un résumé optimisé pour le contexte de l'IA.

## Fonctionnalités

### ✨ Extraction Automatique de Contenu

Lorsqu'un fichier est attaché à un message :

1. **Détection du type** : Le système identifie le type de fichier (code, document, image, etc.)
2. **Extraction de texte** : Le contenu textuel est extrait selon le format
3. **Détection du langage** : Pour les fichiers de code, le langage de programmation est identifié
4. **Génération de résumé** : Un résumé est créé pour les fichiers volumineux (>1000 caractères)
5. **Inclusion dans le contexte** : Le contenu est automatiquement ajouté au contexte de l'IA

### 📄 Types de Fichiers Supportés

#### Texte Brut
- **Formats** : `.txt`, `.md`, `.json`, `.xml`, `.csv`
- **Extraction** : Contenu complet en UTF-8
- **Exemple** : Configuration JSON, documentation Markdown

#### Code Source
- **Langages détectés** : JavaScript, TypeScript, Python, Java, C++, Go, Rust, PHP, etc.
- **Métadonnées** : Langage de programmation, nombre de lignes
- **Exemple** : Fichiers `.js`, `.py`, `.java`

#### Images
- **Formats** : PNG, JPEG, GIF, WebP, SVG
- **Extraction** : Métadonnées de base (nom, taille, type)
- **Futur** : OCR pour extraire le texte des images

#### PDF
- **État actuel** : Placeholder (extraction basique)
- **Futur** : Extraction complète avec pdf.js

## Architecture

### Services Impliqués

```
┌─────────────────────────────────────────────┐
│     FileAttachmentWidget (UI)               │
│     - Upload de fichiers                     │
│     - Affichage des pièces jointes           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  FileAttachmentService                       │
│  - Validation                                │
│  - Stockage                                  │
│  - Appel à FileEmbeddingService             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  FileEmbeddingService                        │
│  - Extraction de contenu                     │
│  - Détection de langage                      │
│  - Génération de résumé                      │
│  - (Futur) Embeddings vectoriels            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  ChatService                                 │
│  - Récupération des fichiers attachés        │
│  - Inclusion dans le contexte IA             │
│  - Envoi au modèle IA                        │
└─────────────────────────────────────────────┘
```

## Utilisation

### Pour les Utilisateurs

#### Attacher et Analyser un Fichier

1. **Attachez votre fichier** au message
2. **Rédigez votre question** sur le fichier
3. **Envoyez** : L'IA reçoit automatiquement le contenu

**Exemple** :
```
Vous : "Peux-tu analyser ce code et trouver les bugs ?"
[📎 script.js - 3.2 KB - javascript]

AlphaCode AI : "J'ai analysé votre fichier script.js. Voici ce que j'ai trouvé..."
```

#### Format du Contexte Envoyé à l'IA

```
=== ATTACHED FILES ===

--- FILE: config.json ---
Type: application/json
Size: 2.4 KB
Language: json

Content:
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    ...
  }
}
--- END OF config.json ---

=== END OF ATTACHED FILES ===
```

### Pour les Développeurs

#### Extraction de Contenu

```typescript
import { IFileEmbeddingService } from '../common/fileEmbeddingService.js';

// Injecter le service
constructor(
    @IFileEmbeddingService 
    private readonly embeddingService: IFileEmbeddingService
) {}

// Extraire le contenu d'un fichier
const text = await embeddingService.extractTextContent(
    buffer,
    'application/json',
    'config.json'
);

// Générer un résumé
const summary = await embeddingService.generateSummary(text, 500);

// Traitement complet pour l'IA
const extraction = await embeddingService.processFileForAI(
    buffer,
    mimeType,
    fileName
);

console.log(extraction.text);           // Contenu extrait
console.log(extraction.summary);        // Résumé (si texte long)
console.log(extraction.metadata);       // Métadonnées (langage, etc.)
```

#### Structure des Données

```typescript
interface IFileContentExtraction {
    // Contenu textuel extrait
    text: string;
    
    // Métadonnées
    metadata: {
        fileName: string;
        mimeType: string;
        size: number;
        language?: string;  // Langage de programmation détecté
    };
    
    // Résumé (généré si texte > 1000 chars)
    summary?: string;
    
    // Embedding vectoriel (futur)
    embedding?: number[];
}
```

#### Stockage dans IFileAttachment

```typescript
interface IFileAttachment {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    uri: URI;
    uploadedAt: number;
    hash: string;
    
    // Nouveau : Contenu extrait pour l'IA
    extractedContent?: {
        text: string;
        summary?: string;
        language?: string;
    };
}
```

## Détection de Langage

Le service détecte automatiquement le langage de programmation par extension :

| Extension | Langage Détecté |
|-----------|----------------|
| `.js` | javascript |
| `.ts` | typescript |
| `.py` | python |
| `.java` | java |
| `.cpp`, `.hpp` | cpp |
| `.rs` | rust |
| `.go` | go |
| `.php` | php |
| `.rb` | ruby |
| `.cs` | csharp |
| `.html` | html |
| `.css` | css |
| `.json` | json |
| `.xml` | xml |
| `.md` | markdown |
| `.sql` | sql |
| `.sh`, `.bash` | shellscript |
| `.ps1` | powershell |

## Génération de Résumé

### Critères de Résumé

- **Déclenché si** : Texte > 1000 caractères
- **Longueur maximale** : 500 caractères (configurable)
- **Contenu** :
  - Métadonnées (lignes, mots, caractères)
  - Premières lignes du fichier
  - Indication de troncature si nécessaire

### Exemple de Résumé

```
[Fichier: 245 lignes, 1834 mots, 12456 caractères]

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  ...
}

[...contenu tronqué...]
```

## Optimisations

### Gestion des Fichiers Volumineux

- **Résumé automatique** : Les fichiers >1KB sont résumés
- **Troncature intelligente** : Préserve les premières lignes significatives
- **Limite de contexte** : Maximum 2000 caractères par fichier dans le contexte IA

### Cache et Performance

- Le contenu extrait est **stocké avec les métadonnées**
- **Pas de re-traitement** lors de la récupération
- Extraction effectuée **une seule fois** à l'upload

## Améliorations Futures

### Court Terme

1. **OCR pour Images**
   - Extraire le texte des captures d'écran
   - Utiliser Tesseract.js ou service cloud

2. **Extraction PDF Complète**
   - Intégrer pdf.js
   - Extraire texte, tableaux, métadonnées

3. **Détection de Langue Naturelle**
   - Détecter la langue (français, anglais, etc.)
   - Ajuster le traitement selon la langue

### Moyen Terme

1. **Embeddings Vectoriels Réels**
   - Intégrer OpenAI Embeddings ou Sentence Transformers
   - Recherche sémantique dans les fichiers attachés
   - Regroupement de fichiers similaires

2. **Analyse de Code Avancée**
   - Extraction des fonctions, classes
   - Analyse de la complexité
   - Détection automatique de problèmes

3. **Support de Plus de Formats**
   - Word (`.docx`)
   - Excel (`.xlsx`)
   - PowerPoint (`.pptx`)
   - Archives (`.zip` avec extraction du contenu)

### Long Terme

1. **IA Vision pour Images**
   - Description automatique des images
   - Détection d'objets, texte, diagrammes
   - Intégration GPT-4 Vision ou similaire

2. **Indexation et Recherche**
   - Index full-text de tous les fichiers
   - Recherche rapide dans l'historique
   - Suggestions basées sur le contenu

3. **Analyse Contextuelle**
   - Comprendre les relations entre fichiers
   - Détection automatique des dépendances
   - Graphe de connaissances

## Configuration

### Paramètres du Service

```typescript
// Longueur maximale du résumé
const maxSummaryLength = 500; // caractères

// Seuil pour générer un résumé
const summaryThreshold = 1000; // caractères

// Longueur maximale dans le contexte IA
const maxContextLength = 2000; // caractères
```

### Personnalisation

Les développeurs peuvent étendre `FileEmbeddingService` pour :

- Ajouter des extracteurs personnalisés
- Modifier les algorithmes de résumé
- Intégrer des services externes (OpenAI, etc.)

## Sécurité et Confidentialité

### Traitement Local

- **Extraction locale** : Aucune donnée envoyée à des services tiers
- **Stockage local** : Fichiers et métadonnées stockés localement
- **Pas de télémétrie** : Le contenu extrait n'est pas partagé

### Données Envoyées à l'IA

- **Seulement le contexte** : Seul le texte extrait est envoyé au modèle IA
- **Résumés préférés** : Les fichiers longs sont résumés avant envoi
- **Contrôle utilisateur** : L'utilisateur voit ce qui est attaché

## Dépannage

### Le Contenu N'est Pas Extrait

**Symptôme** : `[File content not extracted]` affiché

**Causes possibles** :
1. Type MIME non supporté
2. Erreur lors du traitement
3. Fichier binaire sans extracteur

**Solution** :
- Vérifier le type de fichier
- Consulter les logs pour les erreurs
- Utiliser un format supporté

### Résumé Trop Court

**Symptôme** : Le résumé ne contient pas assez d'informations

**Solution** :
```typescript
// Augmenter la longueur du résumé
const summary = await embeddingService.generateSummary(text, 1000);
```

### Performance Lente

**Symptôme** : Upload de fichier lent

**Causes** :
- Fichier très volumineux
- Extraction complexe (PDF, images)

**Solution** :
- Limiter la taille des fichiers
- Optimiser les extracteurs
- Traiter en arrière-plan

## Exemples d'Utilisation

### Analyse de Code

```
Utilisateur : "Y a-t-il des vulnérabilités de sécurité dans ce code ?"
[📎 auth.js - 4.5 KB - javascript]

L'IA reçoit le contenu complet du fichier et peut analyser :
- Injection SQL potentielle
- Validation des entrées
- Gestion des erreurs
- Etc.
```

### Révision de Configuration

```
Utilisateur : "Cette configuration est-elle optimale pour la production ?"
[📎 nginx.conf - 2.1 KB - text/plain]

L'IA analyse la configuration et suggère des améliorations.
```

### Compréhension de Document

```
Utilisateur : "Résume-moi ce document et extrais les points clés"
[📎 specification.md - 8.3 KB - markdown]

L'IA lit le markdown et extrait :
- Points principaux
- Exigences
- Contraintes
```

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025  
**Auteur** : Équipe AlphaCode

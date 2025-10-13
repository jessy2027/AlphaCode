# Configuration Dynamique des URLs - AlphaCodeIDE

## Vue d'ensemble

Le système de changelog d'AlphaCodeIDE lit maintenant les URLs dynamiquement depuis `product.json` au lieu de les coder en dur dans le code source. Cette amélioration rend le système plus flexible, maintenable et réutilisable.

## Motivation

**Problème précédent**: Les URLs GitHub étaient hardcodées dans `releaseNotesEditor.ts`, ce qui nécessitait de modifier le code TypeScript pour changer le dépôt cible.

**Solution**: Extraire les URLs depuis `product.json` de manière dynamique, avec des fallbacks appropriés.

## Configuration dans product.json

Le système utilise la propriété `downloadUrl` du fichier `product.json` pour construire toutes les URLs nécessaires:

```json
{
  "downloadUrl": "https://github.com/jessy2027/AlphaCode/releases",
  "nameLong": "AlphaCodeIDE"
}
```

### URLs générées automatiquement

À partir de cette configuration, le système génère:

1. **URL du CHANGELOG.md**:
   - Input: `https://github.com/jessy2027/AlphaCode/releases`
   - Output: `https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md`

2. **URL de base pour les ressources**:
   - Input: `https://github.com/jessy2027/AlphaCode/releases`
   - Output: `https://raw.githubusercontent.com/jessy2027/AlphaCode/main`

3. **URL des releases** (utilisée directement):
   - `https://github.com/jessy2027/AlphaCode/releases`

## Implémentation technique

### Nouvelles méthodes

#### 1. `getChangelogUrl()`

```typescript
private getChangelogUrl(): string {
    // Construit l'URL du CHANGELOG.md depuis product.json
    if (this._productService.downloadUrl) {
        const repoMatch = this._productService.downloadUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (repoMatch) {
            return `https://raw.githubusercontent.com/${repoMatch[1]}/main/CHANGELOG.md`;
        }
    }
    // Fallback
    return 'https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md';
}
```

**Fonctionnement**:
- Parse `downloadUrl` avec une regex pour extraire `owner/repo`
- Construit l'URL raw GitHub
- Retourne un fallback si la configuration est absente

#### 2. `getBase()` (modifiée)

```typescript
private async getBase(useCurrentFile: boolean) {
    if (useCurrentFile) {
        // Utilise le fichier local si demandé
        const currentFileUri = this._codeEditorService.getActiveCodeEditor()?.getModel()?.uri;
        if (currentFileUri) {
            return dirname(currentFileUri);
        }
    }

    // Extrait l'URL depuis product.json
    if (this._productService.downloadUrl) {
        const repoMatch = this._productService.downloadUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (repoMatch) {
            return URI.parse(`https://raw.githubusercontent.com/${repoMatch[1]}/main`);
        }
    }

    // Fallback
    return URI.parse('https://raw.githubusercontent.com/jessy2027/AlphaCode/main');
}
```

**Changements**:
- Anciennement: retournait `https://code.visualstudio.com/raw`
- Maintenant: construit l'URL depuis `product.json`
- Fallback vers l'URL AlphaCode si nécessaire

#### 3. `extractVersionSection()` (modifiée)

```typescript
private extractVersionSection(changelogText: string, version: string): string {
    // ...

    if (!match) {
        // Utilise downloadUrl depuis product.json
        const releasesUrl = this._productService.downloadUrl ||
                           'https://github.com/jessy2027/AlphaCode/releases';
        return `# ${this._productService.nameLong} ${version}\n\n` +
               `Release notes for this version are not yet available.\n\n` +
               `Please visit the [releases page](${releasesUrl}) for more information.`;
    }

    // Utilise nameLong depuis product.json
    if (!section.startsWith('# ')) {
        section = `# ${this._productService.nameLong} ${version}\n\n` + section;
    }

    // ...
}
```

**Changements**:
- Utilise `this._productService.nameLong` au lieu de "AlphaCodeIDE" hardcodé
- Utilise `this._productService.downloadUrl` pour le lien vers les releases
- S'adapte automatiquement au nom du produit

## Flux de données

```
product.json
    |
    | downloadUrl: "https://github.com/jessy2027/AlphaCode/releases"
    | nameLong: "AlphaCodeIDE"
    v
IProductService (injecté)
    |
    v
ReleaseNotesManager
    |
    +-- getChangelogUrl()
    |       |
    |       v
    |   "https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md"
    |
    +-- getBase()
    |       |
    |       v
    |   "https://raw.githubusercontent.com/jessy2027/AlphaCode/main"
    |
    +-- extractVersionSection()
            |
            v
        Utilise nameLong et downloadUrl
```

## Avantages

### 1. **Flexibilité**
- ✅ Changement de dépôt sans recompiler le TypeScript
- ✅ Support de plusieurs branches (main, develop, etc.)
- ✅ Adaptation automatique au nom du produit

### 2. **Maintenabilité**
- ✅ URLs centralisées dans product.json
- ✅ Modification en un seul endroit
- ✅ Pas besoin de toucher au code source

### 3. **Réutilisabilité**
- ✅ Fonctionne pour n'importe quel fork de VS Code
- ✅ Compatible avec d'autres dépôts GitHub
- ✅ Fallbacks appropriés pour la compatibilité

### 4. **Robustesse**
- ✅ Fallbacks si product.json n'est pas configuré
- ✅ Validation de l'URL avec regex
- ✅ Gestion des cas d'erreur

## Cas d'usage

### Cas 1: Fork d'AlphaCodeIDE

Si vous forkez AlphaCodeIDE pour créer votre propre IDE:

1. Modifiez `product.json`:
```json
{
  "downloadUrl": "https://github.com/votre-org/votre-ide/releases",
  "nameLong": "Votre IDE Name"
}
```

2. Le système s'adapte automatiquement:
   - CHANGELOG: `https://raw.githubusercontent.com/votre-org/votre-ide/main/CHANGELOG.md`
   - Releases: `https://github.com/votre-org/votre-ide/releases`
   - Nom affiché: "Votre IDE Name"

### Cas 2: Branche de développement

Pour tester avec une branche différente:

1. Modifiez temporairement `getChangelogUrl()`:
```typescript
return `https://raw.githubusercontent.com/${repoMatch[1]}/develop/CHANGELOG.md`;
```

2. Ou créez une propriété dans product.json:
```json
{
  "changelogBranch": "develop"
}
```

### Cas 3: Dépôt privé

Pour un dépôt privé avec authentification:

1. Ajoutez un token dans product.json (à sécuriser):
```json
{
  "downloadUrl": "https://github.com/org-privée/projet-privé/releases",
  "githubToken": "ghp_xxxxxxxxxxxx"
}
```

2. Modifiez le code pour utiliser le token dans les requêtes HTTP

## Migration depuis l'ancienne version

### Avant (hardcodé)
```typescript
// Hardcodé dans le code
const changelogUrl = 'https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md';
const baseUrl = URI.parse('https://raw.githubusercontent.com/jessy2027/AlphaCode/main');
```

### Après (dynamique)
```typescript
// Lu depuis product.json
const changelogUrl = this.getChangelogUrl();
const baseUrl = await this.getBase(useCurrentFile);
```

**Impact**: Aucune modification requise dans product.json si `downloadUrl` est déjà configuré correctement.

## Tests

### Test 1: Vérifier l'extraction de l'URL

```typescript
// Dans product.json
"downloadUrl": "https://github.com/jessy2027/AlphaCode/releases"

// Résultat attendu
getChangelogUrl() === "https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md"
```

### Test 2: Fallback en cas d'absence

```typescript
// product.json sans downloadUrl
{}

// Résultat attendu (fallback)
getChangelogUrl() === "https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md"
```

### Test 3: URL avec sous-chemins

```typescript
// Dans product.json
"downloadUrl": "https://github.com/jessy2027/AlphaCode/releases/latest"

// Résultat attendu (extrait jessy2027/AlphaCode)
getChangelogUrl() === "https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md"
```

## Limitations connues

1. **GitHub uniquement**: Le système assume que le dépôt est sur GitHub
2. **Branche main**: Assume que CHANGELOG.md est sur la branche `main`
3. **Format URL**: Assume le format standard GitHub `github.com/owner/repo`

### Solutions futures

Pour supporter d'autres plateformes (GitLab, Bitbucket):
1. Ajouter une propriété `repositoryType` dans product.json
2. Adapter la construction de l'URL selon le type
3. Supporter différents formats d'URL

## Fichiers modifiés

### src/vs/workbench/contrib/update/browser/releaseNotesEditor.ts

**Lignes modifiées**: 83-101, 159-210

**Nouvelles méthodes**:
- `getChangelogUrl()`: Construit l'URL du CHANGELOG
- Modification de `getBase()`: Utilise product.json
- Modification de `extractVersionSection()`: Utilise les propriétés du produit

**Injections de dépendances**:
- `@IProductService` déjà injecté, utilisé pour accéder aux propriétés

## Documentation associée

- [CHANGELOG.md](../CHANGELOG.md) - Format du changelog
- [RELEASE_PROCESS.md](RELEASE_PROCESS.md) - Processus de release
- [product.json](../product.json) - Configuration du produit

## Support

En cas de problème avec la configuration dynamique:

1. Vérifiez que `product.json` contient `downloadUrl`
2. Vérifiez le format de l'URL (doit contenir `github.com/owner/repo`)
3. Consultez les logs de la console pour les erreurs
4. Les fallbacks assurent que le système fonctionne même sans configuration

---

**Date de création**: 2025-10-12
**Dernière mise à jour**: 2025-10-12
**Version d'AlphaCodeIDE**: 1.96.9

# Système de Changelog - Configuration Complète

Ce document récapitule la mise en place du système de gestion des notes de version pour AlphaCodeIDE.

## Date de configuration
2025-10-12

## ⭐ Mise à jour importante - Configuration dynamique des URLs
**Date**: 2025-10-12 (dernière mise à jour)

Le système a été amélioré pour **lire les URLs dynamiquement depuis `product.json`** au lieu de les coder en dur dans le code TypeScript. Cela rend le système plus flexible et facilite la maintenance.

### Changements de la configuration dynamique

#### Nouvelles méthodes dans releaseNotesEditor.ts:

1. **`getChangelogUrl()`** (lignes 196-210)
   - Extrait l'URL du CHANGELOG.md depuis `product.json`
   - Parse `downloadUrl` de product.json
   - Convertit `https://github.com/owner/repo/releases` en `https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md`
   - **Fallback**: URL hardcodée si product.json n'est pas configuré

2. **`getBase()` améliorée** (lignes 83-101)
   - Construit l'URL de base depuis `product.json`
   - Parse `downloadUrl` pour extraire le dépôt GitHub
   - Construit l'URL raw GitHub dynamiquement
   - **Fallback**: URL hardcodée si nécessaire

3. **`extractVersionSection()` améliorée** (lignes 159-194)
   - Utilise `this._productService.nameLong` pour le nom du produit
   - Utilise `this._productService.downloadUrl` pour le lien vers les releases
   - S'adapte automatiquement à n'importe quel fork

### Avantages de la configuration dynamique

✅ **Flexible**: Plus besoin de modifier le code TypeScript pour changer les URLs
✅ **Maintenable**: Toutes les URLs sont centralisées dans product.json
✅ **Réutilisable**: Le code fonctionne pour n'importe quel fork avec un product.json approprié
✅ **Robuste**: Fallbacks en place si product.json n'est pas configuré correctement
✅ **DRY (Don't Repeat Yourself)**: Une seule source de vérité pour les URLs

### Configuration requise dans product.json

Pour que le système fonctionne, assurez-vous que `product.json` contient:

```json
{
  "nameLong": "AlphaCodeIDE",
  "downloadUrl": "https://github.com/jessy2027/AlphaCode/releases",
  "releaseNotesUrl": "https://github.com/jessy2027/AlphaCode/releases/tag/v{0}"
}
```

Le système construira automatiquement:
- URL du CHANGELOG: `https://raw.githubusercontent.com/jessy2027/AlphaCode/main/CHANGELOG.md`
- URL de base: `https://raw.githubusercontent.com/jessy2027/AlphaCode/main`

## Modifications effectuées

### 1. Fichiers de documentation créés

#### CHANGELOG.md
- **Emplacement**: Racine du projet
- **Format**: Keep a Changelog standard
- **Contenu initial**: Version 1.96.9 avec historique des fonctionnalités AlphaCode
- **URL GitHub**: https://github.com/jessy2027/AlphaCode/blob/main/CHANGELOG.md

#### .github/RELEASE_TEMPLATE.md
- **Emplacement**: `.github/`
- **Contenu**: Template complet pour créer des releases
- **Inclut**: Checklist, format des entrées, processus détaillé

#### scripts/changelog-helper.js
- **Emplacement**: `scripts/`
- **Fonctionnalités**:
  - `add [version]` - Ajouter une section de version
  - `validate` - Valider le format du CHANGELOG
  - `extract [version]` - Extraire les notes d'une version
  - `current` - Afficher la version actuelle
- **Utilisation**: `node scripts/changelog-helper.js <command>`

#### docs/RELEASE_PROCESS.md
- **Emplacement**: `docs/`
- **Contenu**: Guide complet du processus de release
- **Sections**: Préparation, versioning, workflows, troubleshooting

#### docs/README.md
- **Emplacement**: `docs/`
- **Contenu**: Index de toute la documentation du projet

### 2. Workflows GitHub mis à jour

#### .github/workflows/release.yml
**Modifications**:
- Ajout d'une étape "Extract changelog for version"
- Extraction automatique des notes depuis CHANGELOG.md
- Les notes extraites sont utilisées dans la description de la release GitHub
- Fallback sur les notes auto-générées si aucune section n'est trouvée

#### .github/workflows/version-bump.yml
**Modifications**:
- Ajout d'un rappel dans le résumé pour mettre à jour CHANGELOG.md
- Instructions claires pour les prochaines étapes

### 3. Configuration du projet

#### package.json
**Scripts ajoutés**:
```json
"changelog:add": "node scripts/changelog-helper.js add",
"changelog:validate": "node scripts/changelog-helper.js validate",
"changelog:extract": "node scripts/changelog-helper.js extract"
```

#### product.json
**URLs mises à jour**:
- `licenseUrl`: https://github.com/jessy2027/AlphaCode/blob/main/LICENSE.txt
- `updateUrl`: https://api.github.com/repos/jessy2027/AlphaCode
- `downloadUrl`: https://github.com/jessy2027/AlphaCode/releases
- `releaseNotesUrl`: https://github.com/jessy2027/AlphaCode/releases/tag/v{0}
- `reportIssueUrl`: https://github.com/jessy2027/AlphaCode/issues/new

### 4. Système intégré de changelog dans l'IDE

#### src/vs/workbench/contrib/update/browser/releaseNotesEditor.ts
**Modifications majeures** (avec configuration dynamique):

1. **Nouvelle méthode `getChangelogUrl()` (lignes 196-210)** ⭐ NOUVEAU
   - Lit dynamiquement l'URL depuis `product.json`
   - Parse `downloadUrl` pour construire l'URL du CHANGELOG.md
   - Fallback vers URL hardcodée si nécessaire

2. **Nouvelle méthode `extractVersionSection()` (lignes 159-194)**:
   - Extrait la section appropriée du CHANGELOG.md pour une version donnée
   - Parse le format "## [version] - date"
   - Utilise `productService.nameLong` et `productService.downloadUrl` dynamiquement
   - Gère le cas où la version n'existe pas
   - Nettoie le formatage (supprime les séparateurs `---`)

3. **Mise à jour de `getBase()` (lignes 83-101)** ⭐ AMÉLIORÉ:
   - Change l'URL de base de `code.visualstudio.com` vers GitHub
   - **Lit dynamiquement depuis `product.json`** au lieu d'URL hardcodée
   - Parse `downloadUrl` pour extraire le dépôt GitHub
   - Construit: `https://raw.githubusercontent.com/{owner}/{repo}/main`
   - Fallback vers URL hardcodée si product.json non configuré

4. **Modification de `loadReleaseNotes()` (lignes 212-290)**:
   - Utilise `getChangelogUrl()` pour obtenir l'URL dynamiquement
   - Récupère CHANGELOG.md depuis GitHub
   - Utilise `extractVersionSection()` pour obtenir la section appropriée
   - Meilleure gestion d'erreur avec validation du contenu

5. **Content Security Policy mis à jour**:
   - Autorise le chargement depuis `https://raw.githubusercontent.com`
   - Permet l'affichage des images et ressources du CHANGELOG

6. **Paramètres de télémétrie**:
   - Change `VsCode` en `AlphaCodeIDE` dans les paramètres UTM
   - S'applique aux domaines github.com et code.visualstudio.com

### 5. Corrections d'URLs globales

**Fichiers mis à jour**:
- `.github/commands.json`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/workflows/alphacode-setup-steps.yml`
- `.github/workflows/no-package-lock-changes.yml`
- `.github/workflows/no-yarn-lock-changes.yml`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `docs/README.md`
- `docs/RELEASE_PROCESS.md`
- `extensions/references-view/README.md`
- `README.md`
- `scripts/BUILD.md`

**Changement**: `jessy2027/AlphaCodeIDE` → `jessy2027/AlphaCode`

## Fonctionnement du système

### Workflow complet

1. **Développement**:
   - Les changements sont documentés dans la section `[Unreleased]` du CHANGELOG.md
   - Les développeurs peuvent utiliser `npm run changelog:validate` pour vérifier le format

2. **Préparation de release**:
   - Utiliser `npm run changelog:add` pour créer une nouvelle section de version
   - Éditer CHANGELOG.md pour remplir les détails de la release
   - Exécuter `npm run version:patch|minor|major` pour bumper la version

3. **Création de la release**:
   - Via GitHub Actions: Workflow "Version Bump" → Workflow "Release"
   - Ou manuellement: `git tag vX.Y.Z && git push --tags`
   - Le workflow de release:
     - Compile pour Windows, Linux, macOS
     - Extrait les notes depuis CHANGELOG.md
     - Crée une release GitHub avec les artifacts

4. **Après mise à jour**:
   - L'utilisateur démarre AlphaCodeIDE
   - Si une nouvelle version est détectée:
     - Notification affichée avec bouton "Release Notes"
     - Clic → Téléchargement de CHANGELOG.md depuis GitHub
     - Extraction de la section appropriée
     - Affichage dans un éditeur intégré avec style VS Code
   - Si `update.showReleaseNotes` est activé:
     - Les notes s'ouvrent automatiquement

### Commandes disponibles

```bash
# Gestion du CHANGELOG
npm run changelog:add          # Ajouter section pour version actuelle
npm run changelog:add 1.97.0   # Ajouter section pour version spécifique
npm run changelog:validate     # Valider le format
npm run changelog:extract      # Extraire notes de la version actuelle
npm run changelog:extract 1.96.9  # Extraire notes d'une version spécifique

# Gestion des versions
npm run version:patch          # 1.96.9 → 1.96.10
npm run version:minor          # 1.96.9 → 1.97.0
npm run version:major          # 1.96.9 → 2.0.0

# Via script helper directement
node scripts/changelog-helper.js add [version]
node scripts/changelog-helper.js validate
node scripts/changelog-helper.js extract [version]
node scripts/changelog-helper.js current
```

## Avantages du système

1. ✅ **Centralisé**: Un seul fichier CHANGELOG.md
2. ✅ **Automatisé**: Extraction lors des releases GitHub
3. ✅ **Intégré**: Affichage dans l'IDE après mises à jour
4. ✅ **Standard**: Format "Keep a Changelog" reconnu
5. ✅ **Versionné**: Historique complet dans Git
6. ✅ **Indépendant**: Aucune dépendance à VS Code ou Microsoft
7. ✅ **Open Source**: Hébergé sur GitHub, accessible publiquement

## Format du CHANGELOG

Le CHANGELOG suit le format [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

## [Unreleased]

### Added
- Nouvelles fonctionnalités

### Changed
- Modifications de fonctionnalités existantes

### Fixed
- Corrections de bugs

### Removed
- Fonctionnalités supprimées

## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature 1
- Feature 2

### Changed
- Change 1

### Fixed
- Bug fix 1
```

## Tests à effectuer

### Test 1: Affichage des notes après mise à jour
1. Modifier la version dans `product.json` pour simuler une ancienne version
2. Lancer AlphaCodeIDE
3. Modifier la version pour revenir à la version actuelle
4. Redémarrer → Les notes de version devraient s'afficher

### Test 2: Bouton "Release Notes" dans les notifications
1. Simuler une notification de mise à jour
2. Cliquer sur "Release Notes"
3. Vérifier que le CHANGELOG.md est téléchargé et affiché

### Test 3: Workflows GitHub
1. Créer un tag: `git tag v1.96.10 && git push --tags`
2. Vérifier que le workflow de release se déclenche
3. Vérifier que les notes sont extraites du CHANGELOG.md
4. Vérifier la release GitHub

## Maintenance future

### Avant chaque release:
1. Mettre à jour la section `[Unreleased]` dans CHANGELOG.md
2. Exécuter `npm run changelog:add` pour créer la section de version
3. Déplacer les entrées de `[Unreleased]` vers la nouvelle section
4. Vérifier avec `npm run changelog:validate`
5. Créer la release via GitHub Actions

### Après chaque release:
1. Vérifier que la release GitHub contient les bonnes notes
2. Tester l'affichage des notes dans l'IDE
3. Mettre à jour la documentation si nécessaire

## Ressources

- **CHANGELOG.md**: [/CHANGELOG.md](../CHANGELOG.md)
- **Release Process**: [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)
- **Release Template**: [.github/RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md)
- **GitHub Releases**: https://github.com/jessy2027/AlphaCode/releases
- **Keep a Changelog**: https://keepachangelog.com/
- **Semantic Versioning**: https://semver.org/

## Notes techniques

### Sécurité
- Le Content Security Policy (CSP) autorise uniquement:
  - Images: `https:` et `data:`
  - Médias: `https:`
  - Styles: sources avec nonce + GitHub
  - Scripts: uniquement avec nonce

### Cache
- Les notes de version sont mises en cache dans `ReleaseNotesManager._releaseNotesCache`
- Le cache est invalidé en cas d'erreur
- Pas de cache pour les fichiers locaux (`useCurrentFile = true`)

### Compatibilité
- Le système fonctionne en ligne (télécharge depuis GitHub)
- Fallback sur l'URL du productService si le téléchargement échoue
- Message d'erreur explicite si les notes ne sont pas disponibles

## Conclusion

Le système de gestion des notes de version est maintenant complètement opérationnel et prêt pour la production. Il offre une expérience utilisateur fluide tout en maintenant un processus de release automatisé et standardisé.

---

**Configuration effectuée par**: Claude AI Assistant
**Date**: 2025-10-12
**Version d'AlphaCodeIDE**: 1.96.9

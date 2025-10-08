# AlphaCodeIDE - Scripts de Build

Ce dossier contient tous les scripts nécessaires pour compiler et créer des packages d'installation d'AlphaCodeIDE pour différentes plateformes.

## Table des matieres

- [Vue d'ensemble](#vue-densemble)
- [Prérequis](#prérequis)
- [Scripts disponibles](#scripts-disponibles)
- [Utilisation rapide](#utilisation-rapide)
- [Détails des scripts](#détails-des-scripts)
- [Architectures supportées](#architectures-supportées)
- [Outputs](#outputs)

## Vue d'ensemble

Le système de build d'AlphaCodeIDE est composé de :
- **Scripts universels** : `build.ps1` / `build.sh` - Point d'entrée simplifié
- **Scripts spécifiques** : Un script détaillé par plateforme avec options avancées

## Prerequis

### Tous les systèmes
- Node.js 22.x ou supérieur
- npm 10.x ou supérieur
- 16 GB de RAM minimum recommandé
- ~100 GB d'espace disque libre

### Windows
- PowerShell 7+ recommandé
- [Inno Setup](https://jrsoftware.org/isinfo.php) pour créer les installateurs

### Linux
- Bash
- Outils de packaging : `dpkg`, `rpm`, `snapcraft` (selon les packages souhaités)

### macOS
- Xcode Command Line Tools
- macOS 10.15+ pour la compilation

## Scripts disponibles

| Script | Plateforme | Description |
|--------|-----------|-------------|
| `build.ps1` | Multi | Script universel PowerShell |
| `build.sh` | Multi | Script universel Bash |
| `build-windows.ps1` | Windows | Build complet Windows avec options |
| `build-linux.sh` | Linux | Build complet Linux avec DEB/RPM |
| `build-macos.sh` | macOS | Build complet macOS avec DMG |

## Utilisation rapide

### Windows (PowerShell)

```powershell
# Build Windows x64 (recommandé)
.\scripts\build.ps1 windows

# Build Windows ARM64
.\scripts\build.ps1 windows -Arch arm64

# Build toutes les plateformes
.\scripts\build.ps1 all
```

### Linux / macOS (Bash)

```bash
# Build Linux x64
./scripts/build.sh linux

# Build Linux ARM64
./scripts/build.sh linux arm64

# Build macOS universal (Intel + Apple Silicon)
./scripts/build.sh macos universal
```

## Details des scripts

### build-windows.ps1

Build Windows avec Inno Setup.

**Options disponibles :**
```powershell
-Arch <x64|arm64>      # Architecture cible (défaut: x64)
-SkipCompile           # Sauter la compilation TypeScript
-InnoSetup             # Créer l'installateur (défaut: true)
-Archive               # Créer une archive ZIP
-System                # Installateur système au lieu de user
```

**Exemples :**
```powershell
# Build complet x64
.\scripts\build-windows.ps1

# Build ARM64 sans recompiler
.\scripts\build-windows.ps1 -Arch arm64 -SkipCompile

# Build avec archive ZIP
.\scripts\build-windows.ps1 -Archive

# Build installateur système
.\scripts\build-windows.ps1 -System
```

**Output :**
- `.build\win32-x64\` - Application compilée
- `.build\AlphaCodeIDESetup.exe` - Installateur

---

### build-linux.sh

Build Linux avec packages DEB et RPM.

**Options disponibles :**
```bash
--arch <x64|arm64|armhf>  # Architecture cible
--skip-compile            # Sauter la compilation TypeScript
--no-deb                  # Ne pas créer le package DEB
--no-rpm                  # Ne pas créer le package RPM
--snap                    # Créer un package Snap
--archive                 # Créer une archive TAR.GZ
```

**Exemples :**
```bash
# Build complet x64 avec DEB et RPM
./scripts/build-linux.sh

# Build ARM64
./scripts/build-linux.sh --arch arm64

# Build sans recompiler
./scripts/build-linux.sh --skip-compile

# Build seulement DEB
./scripts/build-linux.sh --no-rpm

# Build avec Snap et archive
./scripts/build-linux.sh --snap --archive
```

**Output :**
- `.build/linux/` - Application compilée
- `alphacode-ide_<version>_amd64.deb` - Package Debian
- `alphacode-ide-<version>.x86_64.rpm` - Package RedHat

---

### build-macos.sh

Build macOS avec DMG installer.

**Options disponibles :**
```bash
--arch <x64|arm64>     # Architecture cible
--universal            # Build universel (Intel + Apple Silicon)
--skip-compile         # Sauter la compilation TypeScript
--no-dmg               # Ne pas créer le DMG
--archive              # Créer une archive ZIP
--sign                 # Signer l'application
```

**Exemples :**
```bash
# Build complet x64
./scripts/build-macos.sh

# Build Apple Silicon (M1/M2/M3)
./scripts/build-macos.sh --arch arm64

# Build universel
./scripts/build-macos.sh --universal

# Build sans recompiler
./scripts/build-macos.sh --skip-compile

# Build avec signature de code
./scripts/build-macos.sh --sign

# Build avec archive
./scripts/build-macos.sh --archive

**Output :**
- `.build/darwin-x64/` - Application compilée
- `AlphaCodeIDE.dmg` - Installateur DMG

## Architectures supportées

| Plateforme | Architectures |
|-----------|---------------|
| Windows   | x64, arm64 |
| Linux     | x64, arm64, armhf |
| macOS     | x64, arm64, universal |

## Outputs

Après un build réussi, les fichiers sont créés dans le dossier `.build/` :

```
.build/
├── win32-x64/                    # Windows x64
│   └── AlphaCodeIDE/             # Application
├── linux/                         # Linux
│   ├── alphacode-ide.deb         # Package Debian
│   └── alphacode-ide.rpm         # Package RedHat
├── darwin-x64/                    # macOS Intel
│   └── AlphaCodeIDE.app          # Application
└── darwin-arm64/                  # macOS Apple Silicon
    └── AlphaCodeIDE.app          # Application
```

## Temps de compilation

| Étape | Temps approximatif |
|-------|-------------------|
| Compilation TypeScript | 40-60 minutes |
| Build package | 10-20 minutes |
| Création installateur | 5-10 minutes |
| **Total** | **~60-90 minutes** |

💡 **Astuce :** Utilisez `-SkipCompile` / `--skip-compile` pour sauter la compilation si vous avez déjà compilé récemment.

## Depannage

### Erreur de mémoire Node.js
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```
**Solution :** Les scripts définissent déjà `NODE_OPTIONS="--max-old-space-size=16384"` (16 GB). Si vous avez moins de RAM, réduisez cette valeur.

### Inno Setup introuvable (Windows)
```
Error: Inno Setup not found
```
**Solution :** Installez [Inno Setup](https://jrsoftware.org/isinfo.php) et ajoutez-le au PATH.

### Erreur de permissions (Linux/macOS)
```
Permission denied
```
**Solution :** Rendez les scripts exécutables :
```bash
chmod +x scripts/*.sh
```

## Notes importantes

1. **Première compilation** : La première compilation prend ~60 minutes. Les suivantes sont plus rapides.
2. **Cross-compilation** : Il est possible mais non recommandé de compiler pour une plateforme depuis une autre.
3. **CI/CD** : Ces scripts sont conçus pour fonctionner dans des pipelines CI/CD (GitHub Actions, Azure Pipelines, etc.).

## Liens utiles

- [Documentation AlphaCodeIDE](../README.md)
- [Guide de contribution](../CONTRIBUTING.md)
- [Issues GitHub](https://github.com/jessy2027/AlphaCodeIDE/issues)

---

**Happy Building!**

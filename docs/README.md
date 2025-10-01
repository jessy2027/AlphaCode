# Documentation AlphaCode

Bienvenue dans la documentation d'AlphaCodeIDE!

## 📚 Table des matières

### Guides généraux
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Guide de développement
- **[EXAMPLES.md](EXAMPLES.md)** - Exemples d'utilisation
- **[FIX_CHAT_NOT_DISPLAYING.md](FIX_CHAT_NOT_DISPLAYING.md)** - Résolution de problèmes

### 🆕 Système d'outils agent
- **[CHAT_TOOLS.md](CHAT_TOOLS.md)** - Documentation complète des outils
- **[CHAT_TOOLS_EXAMPLES.md](CHAT_TOOLS_EXAMPLES.md)** - Exemples d'utilisation des outils

## 🚀 Démarrage rapide

### Pour les utilisateurs

Si vous voulez utiliser les outils agent d'AlphaCode:

1. **Guide rapide** → Voir [../CHAT_AGENT_QUICKSTART.md](../CHAT_AGENT_QUICKSTART.md)
2. **Référence des outils** → Voir [CHAT_TOOLS.md](CHAT_TOOLS.md)
3. **Exemples** → Voir [CHAT_TOOLS_EXAMPLES.md](CHAT_TOOLS_EXAMPLES.md)

### Pour les développeurs

Si vous voulez contribuer ou comprendre le code:

1. **Architecture** → Voir [../CHAT_AGENT_IMPLEMENTATION.md](../CHAT_AGENT_IMPLEMENTATION.md)
2. **Notes techniques** → Voir [../CHAT_TOOLS_NOTES.md](../CHAT_TOOLS_NOTES.md)
3. **Guide de développement** → Voir [DEVELOPMENT.md](DEVELOPMENT.md)

## 📖 Documentation des outils agent

### CHAT_TOOLS.md
Documentation de référence complète du système d'outils:
- Architecture du système
- Liste des 7 outils disponibles avec descriptions
- Paramètres et exemples pour chaque outil
- Comment le LLM utilise les outils
- Guide pour ajouter de nouveaux outils
- Considérations de sécurité

### CHAT_TOOLS_EXAMPLES.md
Exemples concrets d'utilisation:
- 7 scénarios détaillés avec conversations complètes
- Cas d'usage réels (exploration, création, modification, etc.)
- Conseils pour obtenir de meilleurs résultats
- Ce que l'IA peut et ne peut pas faire

## 🔧 Outils disponibles

| Outil | Description | Documentation |
|-------|-------------|---------------|
| `read_file` | Lit le contenu d'un fichier | [CHAT_TOOLS.md](CHAT_TOOLS.md#1-read_file) |
| `list_directory` | Liste les fichiers d'un dossier | [CHAT_TOOLS.md](CHAT_TOOLS.md#2-list_directory) |
| `search_files` | Recherche des fichiers par pattern | [CHAT_TOOLS.md](CHAT_TOOLS.md#3-search_files) |
| `write_file` | Crée ou écrase un fichier | [CHAT_TOOLS.md](CHAT_TOOLS.md#4-write_file) |
| `edit_file` | Édite un fichier existant | [CHAT_TOOLS.md](CHAT_TOOLS.md#5-edit_file) |
| `get_file_info` | Obtient les métadonnées | [CHAT_TOOLS.md](CHAT_TOOLS.md#6-get_file_info) |
| `delete_file` | Supprime un fichier/dossier | [CHAT_TOOLS.md](CHAT_TOOLS.md#7-delete_file) |

## 💡 Exemples rapides

### Lire un fichier
```
Vous: "Lis le fichier src/main.ts"
IA: [Utilise read_file] "Voici le contenu du fichier..."
```

### Créer un fichier
```
Vous: "Crée un fichier utils/logger.ts avec une fonction de logging"
IA: [Utilise write_file] "J'ai créé le fichier avec..."
```

### Explorer le projet
```
Vous: "Montre-moi la structure du dossier src"
IA: [Utilise list_directory] "Le dossier contient..."
```

## 🔗 Liens utiles

### Documentation principale
- [ALPHACODE_README.md](../ALPHACODE_README.md) - README principal
- [CHAT_AGENT_QUICKSTART.md](../CHAT_AGENT_QUICKSTART.md) - Guide rapide
- [CHAT_AGENT_IMPLEMENTATION.md](../CHAT_AGENT_IMPLEMENTATION.md) - Documentation technique

### Résumés et index
- [CHAT_TOOLS_SUMMARY.md](../CHAT_TOOLS_SUMMARY.md) - Résumé de l'implémentation
- [CHAT_TOOLS_INDEX.md](../CHAT_TOOLS_INDEX.md) - Index de navigation
- [CHAT_TOOLS_NOTES.md](../CHAT_TOOLS_NOTES.md) - Notes techniques

## 📊 Structure de la documentation

```
docs/
├── README.md (ce fichier)
├── CHAT_TOOLS.md (référence des outils)
├── CHAT_TOOLS_EXAMPLES.md (exemples)
├── DEVELOPMENT.md (guide développement)
├── EXAMPLES.md (exemples généraux)
└── FIX_CHAT_NOT_DISPLAYING.md (troubleshooting)

Racine du projet:
├── CHAT_AGENT_QUICKSTART.md (guide rapide)
├── CHAT_AGENT_IMPLEMENTATION.md (architecture)
├── CHAT_TOOLS_SUMMARY.md (résumé)
├── CHAT_TOOLS_INDEX.md (index)
└── CHAT_TOOLS_NOTES.md (notes techniques)
```

## 🎯 Parcours de lecture recommandés

### Parcours utilisateur (30 min)
1. [../CHAT_AGENT_QUICKSTART.md](../CHAT_AGENT_QUICKSTART.md) - 10 min
2. [CHAT_TOOLS.md](CHAT_TOOLS.md) - 10 min
3. [CHAT_TOOLS_EXAMPLES.md](CHAT_TOOLS_EXAMPLES.md) - 10 min

### Parcours développeur (1h30)
1. [../CHAT_AGENT_IMPLEMENTATION.md](../CHAT_AGENT_IMPLEMENTATION.md) - 30 min
2. [CHAT_TOOLS.md](CHAT_TOOLS.md) - 20 min
3. [../CHAT_TOOLS_NOTES.md](../CHAT_TOOLS_NOTES.md) - 20 min
4. [DEVELOPMENT.md](DEVELOPMENT.md) - 20 min

### Parcours contributeur (2h)
1. Suivre le parcours développeur - 1h30
2. Explorer le code source - 20 min
3. Lire [../CHAT_TOOLS_SUMMARY.md](../CHAT_TOOLS_SUMMARY.md) - 10 min

## 🆘 Besoin d'aide?

### Questions fréquentes

**Comment utiliser les outils?**
→ [../CHAT_AGENT_QUICKSTART.md](../CHAT_AGENT_QUICKSTART.md)

**Quels outils sont disponibles?**
→ [CHAT_TOOLS.md](CHAT_TOOLS.md)

**Comment ça marche techniquement?**
→ [../CHAT_AGENT_IMPLEMENTATION.md](../CHAT_AGENT_IMPLEMENTATION.md)

**J'ai un problème**
→ [../CHAT_TOOLS_NOTES.md](../CHAT_TOOLS_NOTES.md) (section "Problèmes connus")

**Je veux contribuer**
→ [DEVELOPMENT.md](DEVELOPMENT.md) + [../CHAT_TOOLS_NOTES.md](../CHAT_TOOLS_NOTES.md)

## 📝 Contribuer à la documentation

Pour améliorer cette documentation:

1. Les fichiers sont en Markdown
2. Suivre le style existant
3. Ajouter des exemples concrets
4. Mettre à jour l'index si nécessaire

## 🔄 Dernières mises à jour

### 1er octobre 2025
- ✅ Ajout de la documentation des outils agent
- ✅ Création de CHAT_TOOLS.md
- ✅ Création de CHAT_TOOLS_EXAMPLES.md
- ✅ Mise à jour de ce README

---

**Bonne lecture! 📖**

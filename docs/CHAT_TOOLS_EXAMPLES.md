# Exemples d'utilisation des outils du chat

Ce document présente des exemples concrets d'interactions avec AlphaCode AI utilisant les outils d'agent.

## Exemple 1: Exploration de projet

### Conversation

**👤 Utilisateur:**
> Peux-tu me montrer la structure du dossier src?

**🤖 AlphaCode AI:**
> Je vais lister le contenu du dossier src pour vous.

```tool
{
  "name": "list_directory",
  "parameters": {
    "path": "src"
  }
}
```

**🔧 Résultat de l'outil:**
```
Directory: src

[DIR] components
[DIR] services
[DIR] utils
[FILE] main.ts (2.5 KB)
[FILE] app.ts (5.1 KB)
[FILE] config.ts (1.2 KB)
```

**🤖 AlphaCode AI:**
> Le dossier src contient 3 sous-dossiers (components, services, utils) et 3 fichiers principaux:
> - main.ts (2.5 KB) - Point d'entrée de l'application
> - app.ts (5.1 KB) - Configuration de l'application
> - config.ts (1.2 KB) - Fichier de configuration

---

## Exemple 2: Création de fichier

### Conversation

**👤 Utilisateur:**
> Crée un fichier utils/logger.ts avec une fonction de logging simple

**🤖 AlphaCode AI:**
> Je vais créer un fichier logger.ts avec une fonction de logging.

```tool
{
  "name": "write_file",
  "parameters": {
    "path": "src/utils/logger.ts",
    "content": "export enum LogLevel {\n  DEBUG = 'DEBUG',\n  INFO = 'INFO',\n  WARN = 'WARN',\n  ERROR = 'ERROR'\n}\n\nexport class Logger {\n  constructor(private context: string) {}\n\n  private log(level: LogLevel, message: string, ...args: any[]) {\n    const timestamp = new Date().toISOString();\n    console.log(`[${timestamp}] [${level}] [${this.context}] ${message}`, ...args);\n  }\n\n  debug(message: string, ...args: any[]) {\n    this.log(LogLevel.DEBUG, message, ...args);\n  }\n\n  info(message: string, ...args: any[]) {\n    this.log(LogLevel.INFO, message, ...args);\n  }\n\n  warn(message: string, ...args: any[]) {\n    this.log(LogLevel.WARN, message, ...args);\n  }\n\n  error(message: string, ...args: any[]) {\n    this.log(LogLevel.ERROR, message, ...args);\n  }\n}\n\nexport const createLogger = (context: string) => new Logger(context);"
  }
}
```

**🔧 Résultat de l'outil:**
```
Successfully wrote to file: src/utils/logger.ts
```

**🤖 AlphaCode AI:**
> J'ai créé le fichier logger.ts avec:
> - Un enum `LogLevel` pour les niveaux de log
> - Une classe `Logger` avec les méthodes debug, info, warn, error
> - Une fonction factory `createLogger` pour créer des instances

---

## Exemple 3: Recherche et modification

### Conversation

**👤 Utilisateur:**
> Trouve tous les fichiers de test et montre-moi le premier

**🤖 AlphaCode AI:**
> Je vais chercher les fichiers de test dans le projet.

```tool
{
  "name": "search_files",
  "parameters": {
    "pattern": "*.test.ts",
    "maxResults": 10
  }
}
```

**🔧 Résultat de l'outil:**
```
Found 5 file(s) matching "*.test.ts":

src/utils/logger.test.ts
src/services/api.test.ts
src/components/Button.test.ts
src/components/Input.test.ts
src/app.test.ts
```

**🤖 AlphaCode AI:**
> J'ai trouvé 5 fichiers de test. Laissez-moi lire le premier.

```tool
{
  "name": "read_file",
  "parameters": {
    "path": "src/utils/logger.test.ts"
  }
}
```

**🔧 Résultat de l'outil:**
```
File: src/utils/logger.test.ts

import { Logger, LogLevel } from './logger';

describe('Logger', () => {
  it('should log debug messages', () => {
    const logger = new Logger('test');
    logger.debug('test message');
  });
});
```

**🤖 AlphaCode AI:**
> Le fichier logger.test.ts contient un test basique pour la classe Logger. Il teste uniquement la méthode debug. Voulez-vous que j'ajoute plus de tests?

---

## Exemple 4: Édition de fichier

### Conversation

**👤 Utilisateur:**
> Oui, ajoute des tests pour les autres méthodes de logging

**🤖 AlphaCode AI:**
> Je vais ajouter des tests pour info, warn et error.

```tool
{
  "name": "edit_file",
  "parameters": {
    "path": "src/utils/logger.test.ts",
    "oldText": "describe('Logger', () => {\n  it('should log debug messages', () => {\n    const logger = new Logger('test');\n    logger.debug('test message');\n  });\n});",
    "newText": "describe('Logger', () => {\n  let logger: Logger;\n\n  beforeEach(() => {\n    logger = new Logger('test');\n  });\n\n  it('should log debug messages', () => {\n    logger.debug('test message');\n  });\n\n  it('should log info messages', () => {\n    logger.info('info message');\n  });\n\n  it('should log warn messages', () => {\n    logger.warn('warning message');\n  });\n\n  it('should log error messages', () => {\n    logger.error('error message');\n  });\n});"
  }
}
```

**🔧 Résultat de l'outil:**
```
Successfully edited file: src/utils/logger.test.ts
Replaced text with new content.
```

**🤖 AlphaCode AI:**
> J'ai ajouté les tests manquants:
> - Test pour `info()`
> - Test pour `warn()`
> - Test pour `error()`
> 
> J'ai également ajouté un `beforeEach` pour initialiser le logger avant chaque test.

---

## Exemple 5: Analyse multi-fichiers

### Conversation

**👤 Utilisateur:**
> Analyse tous les fichiers TypeScript dans src/components et dis-moi lesquels n'ont pas de tests

**🤖 AlphaCode AI:**
> Je vais d'abord lister les composants, puis vérifier leurs tests.

```tool
{
  "name": "search_files",
  "parameters": {
    "pattern": "*.tsx",
    "maxResults": 50
  }
}
```

**🔧 Résultat de l'outil:**
```
Found 4 file(s) matching "*.tsx":

src/components/Button.tsx
src/components/Input.tsx
src/components/Modal.tsx
src/components/Card.tsx
```

**🤖 AlphaCode AI:**
> Maintenant je vérifie les fichiers de test correspondants.

```tool
{
  "name": "search_files",
  "parameters": {
    "pattern": "*.test.tsx",
    "maxResults": 50
  }
}
```

**🔧 Résultat de l'outil:**
```
Found 2 file(s) matching "*.test.tsx":

src/components/Button.test.tsx
src/components/Input.test.tsx
```

**🤖 AlphaCode AI:**
> Analyse terminée! Voici les composants sans tests:
> 
> ❌ **Modal.tsx** - Pas de fichier de test
> ❌ **Card.tsx** - Pas de fichier de test
> 
> ✅ Button.tsx - A un test
> ✅ Input.tsx - A un test
> 
> Voulez-vous que je crée des tests pour Modal et Card?

---

## Exemple 6: Refactoring avec contexte

### Conversation

**👤 Utilisateur:**
> Oui, crée un test pour Modal.tsx

**🤖 AlphaCode AI:**
> Laissez-moi d'abord lire Modal.tsx pour comprendre son API.

```tool
{
  "name": "read_file",
  "parameters": {
    "path": "src/components/Modal.tsx"
  }
}
```

**🔧 Résultat de l'outil:**
```
File: src/components/Modal.tsx

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
```

**🤖 AlphaCode AI:**
> Parfait! Je vais créer un test complet pour ce composant Modal.

```tool
{
  "name": "write_file",
  "parameters": {
    "path": "src/components/Modal.test.tsx",
    "content": "import React from 'react';\nimport { render, screen, fireEvent } from '@testing-library/react';\nimport { Modal } from './Modal';\n\ndescribe('Modal', () => {\n  const mockOnClose = jest.fn();\n\n  beforeEach(() => {\n    mockOnClose.mockClear();\n  });\n\n  it('should not render when isOpen is false', () => {\n    const { container } = render(\n      <Modal isOpen={false} onClose={mockOnClose} title=\"Test Modal\">\n        <p>Content</p>\n      </Modal>\n    );\n    expect(container.firstChild).toBeNull();\n  });\n\n  it('should render when isOpen is true', () => {\n    render(\n      <Modal isOpen={true} onClose={mockOnClose} title=\"Test Modal\">\n        <p>Content</p>\n      </Modal>\n    );\n    expect(screen.getByText('Test Modal')).toBeInTheDocument();\n    expect(screen.getByText('Content')).toBeInTheDocument();\n  });\n\n  it('should call onClose when overlay is clicked', () => {\n    render(\n      <Modal isOpen={true} onClose={mockOnClose} title=\"Test Modal\">\n        <p>Content</p>\n      </Modal>\n    );\n    const overlay = screen.getByText('Test Modal').closest('.modal-overlay');\n    fireEvent.click(overlay!);\n    expect(mockOnClose).toHaveBeenCalledTimes(1);\n  });\n\n  it('should call onClose when close button is clicked', () => {\n    render(\n      <Modal isOpen={true} onClose={mockOnClose} title=\"Test Modal\">\n        <p>Content</p>\n      </Modal>\n    );\n    const closeButton = screen.getByText('×');\n    fireEvent.click(closeButton);\n    expect(mockOnClose).toHaveBeenCalledTimes(1);\n  });\n\n  it('should not call onClose when modal content is clicked', () => {\n    render(\n      <Modal isOpen={true} onClose={mockOnClose} title=\"Test Modal\">\n        <p>Content</p>\n      </Modal>\n    );\n    const content = screen.getByText('Content');\n    fireEvent.click(content);\n    expect(mockOnClose).not.toHaveBeenCalled();\n  });\n});"
  }
}
```

**🔧 Résultat de l'outil:**
```
Successfully wrote to file: src/components/Modal.test.tsx
```

**🤖 AlphaCode AI:**
> J'ai créé un fichier de test complet pour Modal.tsx avec 5 tests:
> 
> 1. ✅ Vérifie que le modal ne s'affiche pas quand `isOpen` est false
> 2. ✅ Vérifie que le modal s'affiche quand `isOpen` est true
> 3. ✅ Vérifie que `onClose` est appelé au clic sur l'overlay
> 4. ✅ Vérifie que `onClose` est appelé au clic sur le bouton de fermeture
> 5. ✅ Vérifie que `onClose` n'est pas appelé au clic sur le contenu
> 
> Les tests couvrent tous les comportements principaux du composant.

---

## Exemple 7: Obtenir des informations

### Conversation

**👤 Utilisateur:**
> Quelle est la taille du fichier package.json?

**🤖 AlphaCode AI:**
> Je vais obtenir les informations sur package.json.

```tool
{
  "name": "get_file_info",
  "parameters": {
    "path": "package.json"
  }
}
```

**🔧 Résultat de l'outil:**
```
Path: package.json
Type: File
Size: 3.45 KB
Last Modified: 10/1/2025, 4:32:15 PM
```

**🤖 AlphaCode AI:**
> Le fichier package.json fait **3.45 KB** et a été modifié pour la dernière fois le 1er octobre 2025 à 16h32.

---

## Conseils pour les utilisateurs

### Pour obtenir de meilleurs résultats:

1. **Soyez spécifique** - "Lis le fichier src/main.ts" plutôt que "regarde le code"
2. **Demandez des actions concrètes** - "Crée un fichier X avec Y" plutôt que "j'ai besoin de X"
3. **Donnez du contexte** - "Le fichier config.ts a un bug dans la fonction init()"
4. **Validez les actions** - Vérifiez les modifications proposées avant de les accepter

### Le LLM peut:

- ✅ Lire et analyser des fichiers
- ✅ Créer de nouveaux fichiers
- ✅ Modifier des fichiers existants
- ✅ Chercher des fichiers par pattern
- ✅ Explorer la structure du projet
- ✅ Obtenir des métadonnées de fichiers

### Le LLM ne peut pas (encore):

- ❌ Exécuter des commandes shell
- ❌ Interagir avec Git
- ❌ Installer des packages
- ❌ Démarrer des serveurs
- ❌ Faire des requêtes réseau

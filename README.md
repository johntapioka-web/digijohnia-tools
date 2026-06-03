# digijohnia-tools — Repo GitHub DIAS

Ce dépôt contient tous les outils HTML de Digijohn AI Solutions.
Chaque push sur `main` déclenche un déploiement automatique sur **digijohnia.solutions** via Netlify.

## Structure

```
/
├── index.html                    ← Page hub (digijohnia.solutions)
├── netlify.toml                  ← Config déploiement (ne pas modifier)
├── calculateur-baobab/
│   └── index.html                ← digijohnia.solutions/calculateur-baobab
├── audit-ia-express/
│   └── index.html                ← digijohnia.solutions/audit-ia-express
└── [nom-outil]/
    └── index.html                ← digijohnia.solutions/[nom-outil]
```

## Ajouter un nouvel outil

1. Créer un dossier `nom-client-outil/`
2. Y déposer le fichier HTML renommé `index.html`
3. Ajouter la carte dans `index.html` (hub) — copier le bloc commenté
4. Commit + push → déployé en 30 secondes

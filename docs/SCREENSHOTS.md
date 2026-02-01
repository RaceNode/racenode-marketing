# Screenshots - RaceNode Marketing

## Format recommandé

| Device | Largeur | Hauteur | Ratio |
|--------|---------|---------|-------|
| **Desktop** | 1920px | 1080px | 16:9 |
| **Tablet** | 768px | 1024px | 3:4 |
| **Mobile** | 375px | 812px | 9:19.5 |

**Format fichier** : PNG (qualité) ou WebP (compression)

---

## Checklist des pages

### Pages principales

- [ ] `home-desktop.png` - Page d'accueil (index)
- [ ] `home-mobile.png` - Page d'accueil (mobile)
- [ ] `pricing-desktop.png` - Page tarification
- [ ] `pricing-mobile.png` - Page tarification (mobile)

### Pages modules

- [ ] `module-logistics-desktop.png` - Module Logistique
- [ ] `module-logistics-mobile.png` - Module Logistique (mobile)
- [ ] `module-management-desktop.png` - Module Gestion d'équipe
- [ ] `module-management-mobile.png` - Module Gestion d'équipe (mobile)

### Pages légales

- [ ] `legal-terms-desktop.png` - Conditions d'utilisation
- [ ] `legal-privacy-desktop.png` - Politique de confidentialité

### Sections spécifiques (optionnel)

Si tu veux capturer des sections isolées :

- [ ] `section-hero.png` - Hero section (accueil)
- [ ] `section-features.png` - Grille des features
- [ ] `section-pricing-cards.png` - Cartes de pricing uniquement
- [ ] `section-footer.png` - Footer

---

## Convention de nommage

```
[page]-[device].png
[section]-[nom].png
[module]-[nom]-[device].png
```

**Exemples** :
- `home-desktop.png`
- `pricing-mobile.png`
- `module-logistics-desktop.png`
- `section-hero.png`

---

## Structure du dossier

```
docs/screenshots/
├── desktop/          # Toutes les versions desktop
│   ├── home.png
│   ├── pricing.png
│   ├── module-logistics.png
│   ├── module-management.png
│   ├── legal-terms.png
│   └── legal-privacy.png
├── mobile/           # Toutes les versions mobile
│   ├── home.png
│   ├── pricing.png
│   ├── module-logistics.png
│   └── module-management.png
└── sections/         # Sections isolées (optionnel)
    ├── hero.png
    ├── features.png
    └── footer.png
```

---

## URLs des pages

| Page | URL locale | URL prod |
|------|------------|----------|
| Accueil | http://localhost:4321/ | https://www.racenode.com/ |
| Pricing | http://localhost:4321/pricing | https://www.racenode.com/pricing |
| Logistique | http://localhost:4321/logistics | https://www.racenode.com/logistics |
| Management | http://localhost:4321/management | https://www.racenode.com/management |
| Terms | http://localhost:4321/terms | https://www.racenode.com/terms |
| Privacy | http://localhost:4321/privacy | https://www.racenode.com/privacy |

---

## Tips

1. **Full page scroll** : Pour capturer une page entière (scroll), utilise l'outil de capture de Chrome DevTools (Ctrl+Shift+P → "Capture full size screenshot")

2. **Device simulation** : Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M) pour simuler les tailles mobile/tablet

3. **Cacher le scroll** : Ajoute temporairement `overflow: hidden` au body pour éviter la scrollbar dans les captures

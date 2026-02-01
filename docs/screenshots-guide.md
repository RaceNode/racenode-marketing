# Screenshots Guide

Captures d'écran de l'application RaceNode pour le site marketing.

## Emplacement

```
src/assets/screenshots/
```

Les images sont optimisées automatiquement par Astro (WebP, srcset, lazy loading).

## Convention de nommage

```
[module]-[section].png
```

**Exemples :**
- `logistics-overview.png`
- `management-event-staff.png`
- `landing-modules.png`

## Format recommandé

- **Résolution** : 1920x1080 avec Device Pixel Ratio 2 (= image 3840x2160)
- **Format source** : PNG (Astro convertit en WebP)
- **Thème** : Dark mode (obligatoire)
- **Méthode** : Chrome DevTools → Device Mode → Custom device 1920x1080 DPR 2

## Screenshots existants

### Logistics (5/5)

- [x] `logistics-overview.png` - Dashboard overview (hero + features)
- [x] `logistics-staff.png` - Event Staff list
- [x] `logistics-accommodation.png` - Accommodation view
- [x] `logistics-travel.png` - Travel planning
- [x] `logistics-vehicles.png` - Event vehicles

### Management (5/5)

- [x] `management-overview.png` - Dashboard overview (hero + features)
- [x] `management-event-staff.png` - Event Staff list
- [x] `management-racecars.png` - Racecars assignment
- [x] `management-team.png` - Team composition
- [x] `management-meals.png` - Meals planning

### Landing page (1/1)

- [x] `landing-modules.png` - Page "Choose Your Module"

## Tips

1. **Données réalistes** : Utiliser des données de démo crédibles (noms, dates, lieux)
2. **État complet** : Montrer un état "rempli" de l'app, pas vide
3. **Pas de données sensibles** : Flouter ou remplacer les vraies données clients
4. **DPR 2** : Toujours capturer avec Device Pixel Ratio 2 pour des images nettes sur Retina

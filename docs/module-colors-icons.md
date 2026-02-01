# Module Colors & Icons Reference

Design reference for RaceNode modules - colors and Lucide icons.

## Main Modules

| Module     | Color  | Tailwind Class | Icon (Lucide)   |
|------------|--------|----------------|-----------------|
| Personal   | Cyan   | `cyan-500`     | `User`          |
| Staff      | Green  | `green-500`    | `Users`         |
| Fleet      | Yellow | `yellow-500`   | `Van`           |
| Racecars   | Red    | `red-500`      | `Car`           |
| Events     | Blue   | `blue-500`     | `Trophy`        |
| Management | Orange | `orange-500`   | `ClipboardCheck`|
| Logistics  | Purple | `purple-500`   | `Luggage`       |

## Module Tabs (Event-Level Views)

### Events Module (blue)
| Tab       | Icon (Lucide) | Color  |
|-----------|---------------|--------|
| Details   | `Eye`         | Blue   |
| Timetable | `Clock`       | Blue   |

### Management Module (orange)
| Tab         | Icon (Lucide) | Color  |
|-------------|---------------|--------|
| Overview    | `Eye`         | Orange |
| Event Staff | `UserCheck`   | Green  |
| Racecars    | `Car`         | Red    |
| Team        | `UserCog`     | Orange |
| Meals       | `Utensils`    | Orange |

### Logistics Module (purple)
| Tab           | Icon (Lucide) | Color  |
|---------------|---------------|--------|
| Overview      | `Eye`         | Purple |
| Event Staff   | `UserCheck`   | Green  |
| Accommodation | `Bed`         | Cyan   |
| Travel        | `Plane`       | Purple |
| Event Vehicles| `Truck`       | Yellow |

### Personal Module (cyan)
| Tab        | Icon (Lucide)   | Color  |
|------------|-----------------|--------|
| Management | `ClipboardCheck`| Orange |
| Logistics  | `Luggage`       | Purple |

## Design Tokens

- **Background**: `gray-950` (main), `gray-900` (cards)
- **Borders**: `gray-800` (standard), `gray-700` (cards)
- **Text**: White (primary), `gray-400` (secondary), `gray-500` (tertiary)
- **Hover states**: Use `-600` variant (e.g., `green-600` for hover on `green-500`)

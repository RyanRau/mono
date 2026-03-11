export interface LifeCard {
  title: string;
  subtitle: string;
  emoji: string;
  size: "small" | "medium" | "large";
}

export const lifeCards: LifeCard[] = [
  {
    title: "Marathons",
    subtitle: "26.2 miles of controlled suffering",
    emoji: "run",
    size: "medium",
  },
  {
    title: "KLR 650",
    subtitle: "Gravel roads, hill country, no agenda",
    emoji: "motorcycle",
    size: "large",
  },
  {
    title: "Stained Glass",
    subtitle: "Color, lead, and patience",
    emoji: "palette",
    size: "medium",
  },
  {
    title: "Woodworking",
    subtitle: "Router table builds, sawdust therapy",
    emoji: "hammer",
    size: "small",
  },
  {
    title: "Gaming",
    subtitle: "Civ 5 one-more-turns, PS5 weekends, board games",
    emoji: "controller",
    size: "small",
  },
  {
    title: "Golden Retriever",
    subtitle: "Best coworker in the house",
    emoji: "dog",
    size: "large",
  },
];

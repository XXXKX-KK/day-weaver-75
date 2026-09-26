import type { StarterPlan } from "@/lib/routines";
import type { GrowthArea, Priority } from "@/lib/store";

/**
 * The starter survey. It asks the two things onboarding actually needs: what
 * the user keeps forgetting day to day, and what pulls them off the phone. The
 * answers turn straight into upkeep routines plus a pre-ticked block list.
 *
 * Direction-of-growth questions (area, level, anchor) are gone — the app is a
 * planner with a blocker, not a coach. Rozwój stays as a section the user can
 * add to by hand, so the types below still carry the old fields as optional:
 * surveys saved under version 2 keep parsing, and the suggestion rules that
 * read them go quiet on their own when they are missing.
 *
 * The answers are persisted to profiles.survey; `version` guards that shape.
 */

export const SURVEY_VERSION = 3;

/** How far along the user already is in an area. Only read from surveys saved
 *  under version 2 — nothing asks for it any more. */
export type Level = "none" | "irregular" | "regular";

export type Distraction = "social" | "video" | "games" | "other";

export type CustomTile = { title: string; weekdays: number[] };

/** Shape stored in profiles.survey. Snake_case because it's data at rest. */
export type SurveyAnswers = {
  version: number;
  maintenance_tiles: string[];
  custom_tiles: CustomTile[];
  distractions: Distraction[];
  /** Version 2 only. Never written any more, still read by the suggestion
   *  rules for accounts that answered the old survey. */
  areas?: GrowthArea[];
  levels?: Partial<Record<GrowthArea, Level>>;
  anchors?: Partial<Record<GrowthArea, string>>;
};

export const DEFAULT_ANSWERS: SurveyAnswers = {
  version: SURVEY_VERSION,
  maintenance_tiles: [],
  custom_tiles: [],
  distractions: [],
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const MON_WED_FRI = [1, 3, 5];
const WORKDAYS = [1, 2, 3, 4, 5];

export type StarterHabit = { title: string; weekdays: number[] };

/** Small opening habits per area. Onboarding no longer offers them; they are
 *  what the suggestion rules propose when they have an area to work with. */
export const STARTER_HABITS: Record<GrowthArea, Record<Level, StarterHabit>> = {
  body: {
    none: { title: "10 pompek", weekdays: ALL_DAYS },
    irregular: { title: "Trening 20 min", weekdays: MON_WED_FRI },
    regular: { title: "Rozciąganie 10 min po treningu", weekdays: MON_WED_FRI },
  },
  mind: {
    none: { title: "Przeczytaj 5 stron", weekdays: ALL_DAYS },
    irregular: { title: "Przeczytaj 15 stron", weekdays: ALL_DAYS },
    regular: { title: "20 min nauki konkretnej rzeczy", weekdays: ALL_DAYS },
  },
  money: {
    none: { title: "15 min nauki umiejętności", weekdays: ALL_DAYS },
    irregular: { title: "30 min nauki umiejętności", weekdays: ALL_DAYS },
    regular: { title: "1 blok pracy nad projektem", weekdays: WORKDAYS },
  },
  discipline: {
    none: { title: "Telefon odłożony 30 min przed snem", weekdays: ALL_DAYS },
    irregular: { title: "Pobudka o stałej porze", weekdays: ALL_DAYS },
    regular: { title: "Plan jutra wieczorem", weekdays: ALL_DAYS },
  },
};

export type MaintenanceTile = { key: string; title: string; weekdays: number[] };

export const MAINTENANCE_TILES: MaintenanceTile[] = [
  { key: "teeth", title: "Umyć zęby", weekdays: ALL_DAYS },
  { key: "shower", title: "Prysznic", weekdays: ALL_DAYS },
  { key: "supplements", title: "Suplementy", weekdays: ALL_DAYS },
  { key: "protein", title: "Białko", weekdays: ALL_DAYS },
  { key: "water", title: "Wypić 2 l wody", weekdays: ALL_DAYS },
  { key: "charger", title: "Podłączyć telefon do ładowarki", weekdays: ALL_DAYS },
  { key: "prep", title: "Przygotować rzeczy na jutro", weekdays: ALL_DAYS },
  { key: "bed", title: "Posłać łóżko", weekdays: ALL_DAYS },
  { key: "shave", title: "Ogolić się", weekdays: [3, 7] },
  { key: "laundry", title: "Pranie", weekdays: [6] },
  { key: "cleaning", title: "Sprzątanie", weekdays: [6] },
  { key: "groceries", title: "Zakupy", weekdays: [7] },
];

/** Package prefixes per distraction bucket, used to pre-tick installed apps on
 *  the block screen instead of showing one hardcoded list to everyone. */
export const DISTRACTION_OPTIONS: {
  value: Distraction;
  label: string;
  packages: string[];
}[] = [
  {
    value: "social",
    label: "Social media",
    packages: [
      "com.instagram.android",
      "com.facebook.katana",
      "com.facebook.orca",
      "com.zhiliaoapp.musically",
      "com.twitter.android",
      "com.x.android",
      "com.reddit.frontpage",
      "com.snapchat.android",
      "com.linkedin.android",
      "com.pinterest",
      "com.discord",
      "org.telegram.messenger",
    ],
  },
  {
    value: "video",
    label: "YouTube, seriale",
    packages: [
      "com.google.android.youtube",
      "com.netflix.mediaclient",
      "com.disney.disneyplus",
      "com.hbo.hbonow",
      "com.wbd.stream",
      "tv.twitch.android.app",
      "com.amazon.avod.thirdpartyclient",
      "pl.redlabs.redcdn.portal",
    ],
  },
  {
    value: "games",
    label: "Gry",
    packages: [
      "com.king.candycrushsaga",
      "com.supercell.clashofclans",
      "com.supercell.brawlstars",
      "com.mojang.minecraftpe",
      "com.roblox.client",
      "com.dts.freefireth",
      "com.activision.callofduty.shooter",
    ],
  },
  { value: "other", label: "Inne", packages: [] },
];

/** Package names to pre-tick for the picked buckets. */
export function packagesForDistractions(picked: Distraction[]): Set<string> {
  const out = new Set<string>();
  for (const option of DISTRACTION_OPTIONS) {
    if (!picked.includes(option.value)) continue;
    for (const pkg of option.packages) out.add(pkg);
  }
  return out;
}

/** Every tile the user ends up with, preset or hand-written, in one list. */
export function selectedTiles(answers: SurveyAnswers): MaintenanceTile[] {
  const preset = MAINTENANCE_TILES.filter((t) => answers.maintenance_tiles.includes(t.key));
  const custom = answers.custom_tiles.map((t, i) => ({
    key: `custom:${i}`,
    title: t.title,
    weekdays: t.weekdays,
  }));
  return [...preset, ...custom];
}

/** Turn the answers into the rows onboarding will insert. Upkeep only —
 *  onboarding no longer puts anything from Rozwój into the plan. */
export function buildStarterPlan(answers: SurveyAnswers): StarterPlan {
  const normal: Priority = "normal";

  const maintenance = selectedTiles(answers).map((tile) => ({
    key: tile.key,
    title: tile.title,
    priority: normal,
    weekdays: tile.weekdays,
    subtasks: [],
  }));

  return { maintenance, growth: [] };
}

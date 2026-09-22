import type { StarterPlan } from "@/lib/routines";
import type { AnchorLabel, GrowthArea, Priority } from "@/lib/store";

/**
 * The starter survey. It asks what the user wants to become, not how their
 * calendar looks — the answers turn straight into one or two growth habits plus
 * the upkeep they already do, instead of generic "deep work" blocks nobody ran.
 *
 * The answers are persisted to profiles.survey so later suggestion rules can
 * read what the user picked. `version` guards that shape.
 */

export const SURVEY_VERSION = 2;

/** How far along the user already is in an area. Labels differ per area, the
 *  scale doesn't. */
export type Level = "none" | "irregular" | "regular";

export type Distraction = "social" | "video" | "games" | "other";

export type CustomTile = { title: string; weekdays: number[] };

/** Shape stored in profiles.survey. Snake_case because it's data at rest. */
export type SurveyAnswers = {
  version: number;
  /** At most two — the whole point of the first question. */
  areas: GrowthArea[];
  levels: Partial<Record<GrowthArea, Level>>;
  maintenance_tiles: string[];
  custom_tiles: CustomTile[];
  /** Area → anchor ref: "tile:<key>" | "label:wake_up" | "label:after_work". */
  anchors: Partial<Record<GrowthArea, string>>;
  distractions: Distraction[];
};

export const MAX_AREAS = 2;

export const DEFAULT_ANSWERS: SurveyAnswers = {
  version: SURVEY_VERSION,
  areas: [],
  levels: {},
  maintenance_tiles: [],
  custom_tiles: [],
  anchors: {},
  distractions: [],
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const MON_WED_FRI = [1, 3, 5];
const WORKDAYS = [1, 2, 3, 4, 5];

export const AREA_OPTIONS: { value: GrowthArea; label: string; hint: string }[] = [
  { value: "body", label: "Ciało", hint: "trening, forma" },
  { value: "mind", label: "Głowa", hint: "czytanie, nauka" },
  { value: "money", label: "Pieniądze", hint: "nowa umiejętność, dodatkowy zarobek" },
  { value: "discipline", label: "Dyscyplina", hint: "sen, poranek, telefon" },
];

export const LEVEL_QUESTION: Record<GrowthArea, string> = {
  body: "Jak jest teraz z treningiem?",
  mind: "Jak jest teraz z czytaniem?",
  money: "Jak jest teraz z zarabianiem i umiejętnościami?",
  discipline: "Jak jest teraz z dyscypliną?",
};

export const LEVEL_OPTIONS: Record<GrowthArea, { value: Level; label: string }[]> = {
  body: [
    { value: "none", label: "Nie trenuję" },
    { value: "irregular", label: "Nieregularnie" },
    { value: "regular", label: "Regularnie" },
  ],
  mind: [
    { value: "none", label: "Nie czytam" },
    { value: "irregular", label: "Czasem" },
    { value: "regular", label: "Regularnie" },
  ],
  money: [
    { value: "none", label: "Nic nie robię w tym kierunku" },
    { value: "irregular", label: "Coś zaczynam" },
    { value: "regular", label: "Mam projekt" },
  ],
  discipline: [
    { value: "none", label: "Telefon rządzi" },
    { value: "irregular", label: "Bywa różnie" },
    { value: "regular", label: "Ogarniam" },
  ],
};

export type StarterHabit = { title: string; weekdays: number[] };

/** The one growth habit each answer opens with. Deliberately small — the level
 *  sets the size, not the ambition. */
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

export const ANCHOR_REF_WAKE_UP = "label:wake_up";
export const ANCHOR_REF_AFTER_WORK = "label:after_work";

export function tileAnchorRef(tileKey: string): string {
  return `tile:${tileKey}`;
}

function parseAnchor(ref: string | undefined): {
  anchorKey?: string;
  anchor_label?: AnchorLabel;
} {
  if (!ref) return {};
  if (ref.startsWith("tile:")) return { anchorKey: ref.slice("tile:".length) };
  if (ref === ANCHOR_REF_WAKE_UP) return { anchor_label: "wake_up" };
  if (ref === ANCHOR_REF_AFTER_WORK) return { anchor_label: "after_work" };
  return {};
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

/** Human-readable anchor for the preview screen ("Po prysznicu: 10 pompek"). */
export function anchorTitleFor(
  answers: SurveyAnswers,
  area: GrowthArea,
): string | null {
  const ref = answers.anchors[area];
  if (!ref) return null;
  if (ref === ANCHOR_REF_WAKE_UP) return "Rano, zaraz po wstaniu";
  if (ref === ANCHOR_REF_AFTER_WORK) return "Po powrocie z pracy";
  const key = ref.startsWith("tile:") ? ref.slice("tile:".length) : null;
  if (!key) return null;
  return selectedTiles(answers).find((t) => t.key === key)?.title ?? null;
}

/** The growth habit the answers add up to, per picked area. */
export function growthHabitsFor(
  answers: SurveyAnswers,
): { area: GrowthArea; habit: StarterHabit }[] {
  return answers.areas.flatMap((area) => {
    const level = answers.levels[area];
    if (!level) return [];
    return [{ area, habit: STARTER_HABITS[area][level] }];
  });
}

/** Turn the answers into the rows onboarding will insert. */
export function buildStarterPlan(answers: SurveyAnswers): StarterPlan {
  const normal: Priority = "normal";

  const maintenance = selectedTiles(answers).map((tile) => ({
    key: tile.key,
    title: tile.title,
    priority: normal,
    weekdays: tile.weekdays,
    subtasks: [],
  }));

  const growth = growthHabitsFor(answers).map(({ area, habit }) => ({
    title: habit.title,
    priority: normal,
    weekdays: habit.weekdays,
    subtasks: [],
    area,
    ...parseAnchor(answers.anchors[area]),
  }));

  return { maintenance, growth };
}

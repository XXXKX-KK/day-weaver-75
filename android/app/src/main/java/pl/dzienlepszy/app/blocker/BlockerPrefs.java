package pl.dzienlepszy.app.blocker;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Single source of truth for the blocking configuration, stored in native
 * SharedPreferences. Both {@link BlockerPlugin} (writes from the React layer)
 * and {@link BlockerService} (reads while watching foreground apps) go through
 * here, so the service always sees exactly what the UI saved — with no Supabase
 * and no network involved.
 */
public final class BlockerPrefs {

    public static final String PREFS_NAME = "dzienlepszy_blocker";
    public static final String KEY_BLOCKED_PACKAGES = "blocked_packages";
    public static final String KEY_BLOCKING_ENABLED = "blocking_enabled";
    public static final String KEY_CURRENT_TASK = "current_task";
    public static final String KEY_DAY_TASKS = "day_tasks";
    public static final String KEY_ACCENT_KEY = "accent_key";
    public static final String KEY_ACCENT_HEX = "accent_hex";

    private BlockerPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Returns a mutable copy of the blocked package names (never null). */
    public static Set<String> getBlockedPackages(Context context) {
        // getStringSet returns an instance that must not be mutated, so copy it.
        Set<String> stored = prefs(context)
                .getStringSet(KEY_BLOCKED_PACKAGES, Collections.<String>emptySet());
        return new HashSet<>(stored);
    }

    public static void setBlockedPackages(Context context, Set<String> packages) {
        prefs(context).edit()
                .putStringSet(KEY_BLOCKED_PACKAGES, new HashSet<>(packages))
                .apply();
    }

    public static boolean isBlockingEnabled(Context context) {
        return prefs(context).getBoolean(KEY_BLOCKING_ENABLED, false);
    }

    public static void setBlockingEnabled(Context context, boolean enabled) {
        prefs(context).edit()
                .putBoolean(KEY_BLOCKING_ENABLED, enabled)
                .apply();
    }

    /**
     * The task the user is currently focusing on, set manually on the Skupienie
     * screen. Shown by the overlay so the block points back to something
     * concrete. Never null — empty string means "not set".
     */
    public static String getCurrentTask(Context context) {
        return prefs(context).getString(KEY_CURRENT_TASK, "");
    }

    public static void setCurrentTask(Context context, String title) {
        prefs(context).edit()
                .putString(KEY_CURRENT_TASK, title == null ? "" : title.trim())
                .apply();
    }

    /**
     * The ordered list of not-done day-plan titles (day_block + position),
     * written by the React sync as a JSON array. The overlay reads it to let the
     * user skip ("Nie teraz") to the next task. Empty means "no active plan" —
     * the overlay then falls back to {@link #getCurrentTask}.
     */
    public static void setDayTasks(Context context, List<String> titles) {
        JSONArray array = new JSONArray();
        if (titles != null) {
            for (String title : titles) {
                if (title != null && !title.trim().isEmpty()) array.put(title.trim());
            }
        }
        prefs(context).edit()
                .putString(KEY_DAY_TASKS, array.toString())
                .apply();
    }

    /** Returns the stored day-plan titles in order (never null; empty on none). */
    public static List<String> getDayTasks(Context context) {
        List<String> titles = new ArrayList<>();
        String stored = prefs(context).getString(KEY_DAY_TASKS, "");
        if (stored == null || stored.isEmpty()) return titles;
        try {
            JSONArray array = new JSONArray(stored);
            for (int i = 0; i < array.length(); i++) {
                String title = array.optString(i, "");
                if (!title.isEmpty()) titles.add(title);
            }
        } catch (org.json.JSONException ignored) {
            // Corrupt value → treat as empty.
        }
        return titles;
    }

    /**
     * The chosen accent, stored as both a key ("pink"/"orange"/…) and an sRGB
     * hex ("#EE4261"). Written by the app when the user picks an accent; read by
     * the block overlay in a later brief.
     */
    public static void setAccentColor(Context context, String key, String hex) {
        prefs(context).edit()
                .putString(KEY_ACCENT_KEY, key == null ? "" : key)
                .putString(KEY_ACCENT_HEX, hex == null ? "" : hex)
                .apply();
    }

    public static String getAccentHex(Context context) {
        return prefs(context).getString(KEY_ACCENT_HEX, "#EE4261");
    }

    public static String getAccentKey(Context context) {
        return prefs(context).getString(KEY_ACCENT_KEY, "pink");
    }
}

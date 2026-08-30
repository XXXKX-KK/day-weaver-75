package pl.dzienlepszy.app.blocker;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
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
    public static final String KEY_PIN_HASH = "pin_hash";
    public static final String KEY_BREAK_DELAY = "break_delay_seconds";
    public static final String KEY_BREAK_DAILY_LIMIT = "break_daily_limit";
    public static final String KEY_BREAK_USED_COUNT = "break_used_count";
    public static final String KEY_BREAK_USED_DATE = "break_used_date";
    public static final String KEY_UNLOCK_UNTIL = "unlock_until";
    public static final String KEY_UNLOCK_PACKAGE = "unlock_package";

    public static final int DEFAULT_BREAK_DELAY = 15;
    public static final int DEFAULT_BREAK_DAILY_LIMIT = 3;
    public static final long BREAK_DURATION_MS = 5L * 60 * 1000;

    private static final String PIN_SALT = "tenax-pin-v1";

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
     * hex ("#3B82F6"). Written by the app when the user picks an accent; read by
     * the block overlay in a later brief.
     */
    public static void setAccentColor(Context context, String key, String hex) {
        prefs(context).edit()
                .putString(KEY_ACCENT_KEY, key == null ? "" : key)
                .putString(KEY_ACCENT_HEX, hex == null ? "" : hex)
                .apply();
    }

    public static String getAccentHex(Context context) {
        return prefs(context).getString(KEY_ACCENT_HEX, "#3B82F6");
    }

    public static String getAccentKey(Context context) {
        return prefs(context).getString(KEY_ACCENT_KEY, "blue");
    }

    // ── PIN (friction, not encryption — SHA-256 with a static salt) ──

    public static boolean hasPin(Context context) {
        String hash = prefs(context).getString(KEY_PIN_HASH, "");
        return hash != null && !hash.isEmpty();
    }

    public static void setPinHash(Context context, String rawPin) {
        prefs(context).edit()
                .putString(KEY_PIN_HASH, hashPin(rawPin))
                .apply();
    }

    public static boolean verifyPin(Context context, String rawPin) {
        String stored = prefs(context).getString(KEY_PIN_HASH, "");
        if (stored == null || stored.isEmpty()) return false;
        return stored.equals(hashPin(rawPin));
    }

    public static void clearPin(Context context) {
        prefs(context).edit()
                .remove(KEY_PIN_HASH)
                .apply();
    }

    public static String hashPin(String rawPin) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((PIN_SALT + rawPin).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : digest) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    // ── Controlled break ──

    public static int getBreakDelay(Context context) {
        return prefs(context).getInt(KEY_BREAK_DELAY, DEFAULT_BREAK_DELAY);
    }

    public static int getBreakDailyLimit(Context context) {
        return prefs(context).getInt(KEY_BREAK_DAILY_LIMIT, DEFAULT_BREAK_DAILY_LIMIT);
    }

    public static void setBreakConfig(Context context, int delay, int dailyLimit) {
        prefs(context).edit()
                .putInt(KEY_BREAK_DELAY, delay)
                .putInt(KEY_BREAK_DAILY_LIMIT, dailyLimit)
                .apply();
    }

    private static String todayDate() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static int getBreakUsedToday(Context context) {
        SharedPreferences p = prefs(context);
        String storedDate = p.getString(KEY_BREAK_USED_DATE, "");
        if (!todayDate().equals(storedDate)) return 0;
        return p.getInt(KEY_BREAK_USED_COUNT, 0);
    }

    public static void incrementBreakUsed(Context context) {
        String today = todayDate();
        SharedPreferences p = prefs(context);
        String storedDate = p.getString(KEY_BREAK_USED_DATE, "");
        int count = today.equals(storedDate) ? p.getInt(KEY_BREAK_USED_COUNT, 0) : 0;
        p.edit()
                .putString(KEY_BREAK_USED_DATE, today)
                .putInt(KEY_BREAK_USED_COUNT, count + 1)
                .apply();
    }

    public static boolean hasBreaksRemaining(Context context) {
        return getBreakUsedToday(context) < getBreakDailyLimit(context);
    }

    public static boolean isUnlocked(Context context, String packageName) {
        SharedPreferences p = prefs(context);
        long until = p.getLong(KEY_UNLOCK_UNTIL, 0);
        if (System.currentTimeMillis() >= until) return false;
        String pkg = p.getString(KEY_UNLOCK_PACKAGE, "");
        return packageName.equals(pkg);
    }

    public static void setUnlock(Context context, String packageName) {
        prefs(context).edit()
                .putLong(KEY_UNLOCK_UNTIL, System.currentTimeMillis() + BREAK_DURATION_MS)
                .putString(KEY_UNLOCK_PACKAGE, packageName)
                .apply();
    }

    public static void clearUnlock(Context context) {
        prefs(context).edit()
                .remove(KEY_UNLOCK_UNTIL)
                .remove(KEY_UNLOCK_PACKAGE)
                .apply();
    }
}

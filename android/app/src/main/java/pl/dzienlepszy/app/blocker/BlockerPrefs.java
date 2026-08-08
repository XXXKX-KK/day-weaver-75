package pl.dzienlepszy.app.blocker;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Collections;
import java.util.HashSet;
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
}

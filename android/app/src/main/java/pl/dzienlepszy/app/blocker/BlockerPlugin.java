package pl.dzienlepszy.app.blocker;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Native bridge for the app-blocking core:
 *  - lists launchable installed apps (PackageManager),
 *  - reads/writes the blocked list + enabled flag in SharedPreferences,
 *  - starts/stops BlockerForegroundService when blocking is toggled,
 *  - reports and opens Usage Access / Overlay permission screens.
 */
@CapacitorPlugin(name = "Blocker")
public class BlockerPlugin extends Plugin {

    private static final int MAX_ICON_PX = 96;

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        boolean includeIcons = Boolean.TRUE.equals(call.getBoolean("includeIcons", false));
        String self = context.getPackageName();

        // Only apps the user can actually launch (they have a launcher activity).
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolved = pm.queryIntentActivities(launcherIntent, 0);

        JSArray apps = new JSArray();
        Set<String> seen = new HashSet<>();
        for (ResolveInfo info : resolved) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (pkg == null || pkg.equals(self) || !seen.add(pkg)) continue;

            JSObject app = new JSObject();
            app.put("packageName", pkg);
            app.put("appLabel", info.loadLabel(pm).toString());
            if (includeIcons) {
                String icon = encodeIcon(info.loadIcon(pm));
                if (icon != null) app.put("icon", icon);
            }
            apps.put(app);
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void getBlockedApps(PluginCall call) {
        JSArray packages = new JSArray();
        for (String pkg : BlockerPrefs.getBlockedPackages(getContext())) {
            packages.put(pkg);
        }
        JSObject result = new JSObject();
        result.put("packages", packages);
        call.resolve(result);
    }

    @PluginMethod
    public void setBlockedApps(PluginCall call) {
        JSArray packages = call.getArray("packages");
        Set<String> set = new HashSet<>();
        if (packages != null) {
            try {
                List<String> list = packages.toList();
                for (String pkg : list) {
                    if (pkg != null && !pkg.isEmpty()) set.add(pkg);
                }
            } catch (JSONException e) {
                call.reject("Invalid 'packages' array", e);
                return;
            }
        }
        BlockerPrefs.setBlockedPackages(getContext(), set);
        call.resolve();
    }

    @PluginMethod
    public void setBlockingEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Missing 'enabled' boolean");
            return;
        }
        Context context = getContext();
        BlockerPrefs.setBlockingEnabled(context, enabled);
        Intent service = new Intent(context, BlockerForegroundService.class);
        if (enabled) {
            ContextCompat.startForegroundService(context, service);
        } else {
            context.stopService(service);
        }
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void isBlockingEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", BlockerPrefs.isBlockingEnabled(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void setCurrentTask(PluginCall call) {
        String title = call.getString("title", "");
        BlockerPrefs.setCurrentTask(getContext(), title);
        JSObject result = new JSObject();
        result.put("title", BlockerPrefs.getCurrentTask(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void getCurrentTask(PluginCall call) {
        JSObject result = new JSObject();
        result.put("title", BlockerPrefs.getCurrentTask(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void setDayTasks(PluginCall call) {
        JSArray titles = call.getArray("titles");
        List<String> list = new ArrayList<>();
        if (titles != null) {
            try {
                for (String title : titles.<String>toList()) {
                    if (title != null && !title.trim().isEmpty()) list.add(title.trim());
                }
            } catch (JSONException e) {
                call.reject("Invalid 'titles' array", e);
                return;
            }
        }
        BlockerPrefs.setDayTasks(getContext(), list);
        call.resolve();
    }

    /**
     * Mirrors today's Rozwój state so the overlay can withhold breaks until the
     * user has done one thing for themselves. Called on day start and whenever a
     * growth item is ticked.
     */
    @PluginMethod
    public void setGrowthState(PluginCall call) {
        boolean planned = Boolean.TRUE.equals(call.getBoolean("planned", false));
        boolean done = Boolean.TRUE.equals(call.getBoolean("done", false));
        JSArray titles = call.getArray("titles");
        List<String> list = new ArrayList<>();
        if (titles != null) {
            try {
                for (String title : titles.<String>toList()) {
                    if (title != null && !title.trim().isEmpty()) list.add(title.trim());
                }
            } catch (JSONException e) {
                call.reject("Invalid 'titles' array", e);
                return;
            }
        }
        BlockerPrefs.setGrowthState(getContext(), planned, done, list);
        call.resolve();
    }

    @PluginMethod
    public void setAccentColor(PluginCall call) {
        String key = call.getString("key", "");
        String hex = call.getString("hex", "");
        BlockerPrefs.setAccentColor(getContext(), key, hex);
        call.resolve();
    }

    // ── Break config ──

    @PluginMethod
    public void setBreakConfig(PluginCall call) {
        Integer delay = call.getInt("delaySeconds");
        Integer limit = call.getInt("dailyLimit");
        BlockerPrefs.setBreakConfig(
                getContext(),
                delay != null ? delay : BlockerPrefs.DEFAULT_BREAK_DELAY,
                limit != null ? limit : BlockerPrefs.DEFAULT_BREAK_DAILY_LIMIT);
        call.resolve();
    }

    // ── PIN ──

    @PluginMethod
    public void hasPin(PluginCall call) {
        JSObject result = new JSObject();
        result.put("hasPin", BlockerPrefs.hasPin(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void setPin(PluginCall call) {
        String pin = call.getString("pin");
        if (pin == null || pin.isEmpty()) {
            call.reject("Missing 'pin' string");
            return;
        }
        BlockerPrefs.setPinHash(getContext(), pin);
        call.resolve();
    }

    @PluginMethod
    public void verifyPin(PluginCall call) {
        String pin = call.getString("pin");
        if (pin == null || pin.isEmpty()) {
            call.reject("Missing 'pin' string");
            return;
        }
        JSObject result = new JSObject();
        result.put("valid", BlockerPrefs.verifyPin(getContext(), pin));
        call.resolve(result);
    }

    @PluginMethod
    public void clearPin(PluginCall call) {
        BlockerPrefs.clearPin(getContext());
        call.resolve();
    }

    @PluginMethod
    public void isUsageAccessGranted(PluginCall call) {
        Context context = getContext();
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.getPackageName());
        JSObject result = new JSObject();
        result.put("granted", mode == AppOpsManager.MODE_ALLOWED);
        call.resolve(result);
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void isOverlayGranted(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", Settings.canDrawOverlays(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private String encodeIcon(Drawable drawable) {
        if (drawable == null) return null;
        try {
            int width = clampSize(drawable.getIntrinsicWidth());
            int height = clampSize(drawable.getIntrinsicHeight());
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, width, height);
            drawable.draw(canvas);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            bitmap.recycle();
            return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    private int clampSize(int intrinsic) {
        if (intrinsic <= 0) return MAX_ICON_PX;
        return Math.min(intrinsic, MAX_ICON_PX);
    }
}

package pl.dzienlepszy.app.calendar;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/**
 * Read-only bridge to the device calendar (CalendarContract). Events are read
 * straight off the phone and handed to the UI — nothing is written back to the
 * calendar, cached, or sent anywhere.
 *
 * The toggle and the chosen calendar ids live in native SharedPreferences, not
 * Supabase: calendar ids are meaningful only on this device, and keeping them
 * local means no calendar data ever leaves the phone.
 */
@CapacitorPlugin(
        name = "DeviceCalendar",
        permissions = {
                @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR })
        })
public class CalendarPlugin extends Plugin {

    private static final String CALENDAR = "calendar";

    private static final String PREFS_NAME = "dzienlepszy_calendar";
    private static final String KEY_ENABLED = "calendar_enabled";
    private static final String KEY_SELECTED = "calendar_selected_ids";

    private SharedPreferences prefs() {
        return getContext().getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", prefs().getBoolean(KEY_ENABLED, false));
        call.resolve(result);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Missing 'enabled' boolean");
            return;
        }
        prefs().edit().putBoolean(KEY_ENABLED, enabled).apply();
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void getSelectedCalendars(PluginCall call) {
        JSArray ids = new JSArray();
        for (String id : selectedIds()) ids.put(id);
        JSObject result = new JSObject();
        result.put("ids", ids);
        call.resolve(result);
    }

    @PluginMethod
    public void setSelectedCalendars(PluginCall call) {
        JSArray ids = call.getArray("ids");
        Set<String> set = new HashSet<>();
        if (ids != null) {
            try {
                for (String id : ids.<String>toList()) {
                    if (id != null && !id.isEmpty()) set.add(id);
                }
            } catch (JSONException e) {
                call.reject("Invalid 'ids' array", e);
                return;
            }
        }
        prefs().edit().putStringSet(KEY_SELECTED, set).apply();
        call.resolve();
    }

    private Set<String> selectedIds() {
        return new HashSet<>(prefs().getStringSet(KEY_SELECTED, new HashSet<String>()));
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState(CALENDAR) == PermissionState.GRANTED);
        call.resolve(result);
    }

    /** Asked only once the user has switched the feature on in Settings. */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState(CALENDAR) == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(CALENDAR, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState(CALENDAR) == PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void getCalendars(PluginCall call) {
        if (getPermissionState(CALENDAR) != PermissionState.GRANTED) {
            call.reject("Brak uprawnienia do kalendarza");
            return;
        }

        String[] projection = {
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.ACCOUNT_NAME,
        };

        JSArray calendars = new JSArray();
        try (Cursor cursor = getContext().getContentResolver().query(
                CalendarContract.Calendars.CONTENT_URI, projection, null, null, null)) {
            while (cursor != null && cursor.moveToNext()) {
                JSObject item = new JSObject();
                item.put("id", cursor.getString(0));
                item.put("name", cursor.getString(1) == null ? "" : cursor.getString(1));
                item.put("accountName", cursor.getString(2) == null ? "" : cursor.getString(2));
                calendars.put(item);
            }
        } catch (SecurityException e) {
            call.reject("Brak uprawnienia do kalendarza", e);
            return;
        }

        JSObject result = new JSObject();
        result.put("calendars", calendars);
        call.resolve(result);
    }

    /**
     * Events overlapping the given local day. The date comes from JS so the
     * native side agrees with whatever the app currently calls "today".
     *
     * Instances (not Events) is queried on purpose: it expands recurrence rules
     * and returns one row per actual occurrence in the window.
     */
    @PluginMethod
    public void getEventsForDay(PluginCall call) {
        if (getPermissionState(CALENDAR) != PermissionState.GRANTED) {
            call.reject("Brak uprawnienia do kalendarza");
            return;
        }

        String date = call.getString("date");
        if (date == null || date.length() != 10) {
            call.reject("Missing 'date' (yyyy-MM-dd)");
            return;
        }

        long start;
        long end;
        try {
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.YEAR, Integer.parseInt(date.substring(0, 4)));
            cal.set(Calendar.MONTH, Integer.parseInt(date.substring(5, 7)) - 1);
            cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(date.substring(8, 10)));
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            start = cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_MONTH, 1);
            end = cal.getTimeInMillis();
        } catch (NumberFormatException e) {
            call.reject("Invalid 'date' (yyyy-MM-dd)", e);
            return;
        }

        Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
        ContentUris.appendId(builder, start);
        ContentUris.appendId(builder, end);

        String[] projection = {
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.ALL_DAY,
                CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
                CalendarContract.Instances.CALENDAR_ID,
        };

        Set<String> wanted = selectedIds();
        JSArray events = new JSArray();
        try (Cursor cursor = getContext().getContentResolver().query(
                builder.build(), projection, null, null,
                CalendarContract.Instances.BEGIN + " ASC")) {
            while (cursor != null && cursor.moveToNext()) {
                String calendarId = cursor.getString(6);
                // An empty selection means "every calendar" — the user hasn't
                // narrowed it down yet.
                if (!wanted.isEmpty() && !wanted.contains(calendarId)) continue;

                JSObject item = new JSObject();
                item.put("id", cursor.getString(0) + ":" + cursor.getLong(2));
                item.put("title", cursor.getString(1) == null ? "" : cursor.getString(1));
                item.put("start", cursor.getLong(2));
                item.put("end", cursor.getLong(3));
                item.put("allDay", cursor.getInt(4) == 1);
                item.put("calendarName", cursor.getString(5) == null ? "" : cursor.getString(5));
                events.put(item);
            }
        } catch (SecurityException e) {
            call.reject("Brak uprawnienia do kalendarza", e);
            return;
        }

        JSObject result = new JSObject();
        result.put("events", events);
        call.resolve(result);
    }
}

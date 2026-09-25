package pl.dzienlepszy.app.blocker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Set;

import androidx.core.app.NotificationCompat;

import pl.dzienlepszy.app.MainActivity;

public class BlockerForegroundService extends Service {

    private static final String CHANNEL_ID = "blocker_focus";
    private static final int NOTIFICATION_ID = 9001;
    private static final long POLL_INTERVAL_MS = 900L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    /** The package we have already judged — guards against re-launching the
     *  overlay on every poll while the user sits in the same app. */
    private String lastForegroundPkg = "";
    /** Best guess at what is on screen right now. UsageStats only reports app
     *  switches, so once the user settles in an app the query goes quiet; we have
     *  to remember the last answer to know what to judge when a break expires. */
    private String currentForegroundPkg = "";
    private boolean screenOn = true;
    private boolean breakNotificationActive = false;
    /** The unlock end time we already have a one-shot check posted for. */
    private long scheduledExpiryAt = 0L;

    private final BroadcastReceiver screenReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                screenOn = true;
                scheduleNextPoll();
            } else if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                screenOn = false;
                handler.removeCallbacks(pollRunnable);
                // No point launching the overlay behind a dark screen; the
                // expiry is picked up by the first poll after it wakes.
                handler.removeCallbacks(expiryRunnable);
                scheduledExpiryAt = 0L;
            }
        }
    };

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            updateNotificationForBreak();
            pollForeground();
            if (screenOn) {
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        }
    };

    /**
     * One-shot check fired at the exact moment a break runs out, so the block
     * comes back to the second instead of waiting for the next poll.
     */
    private final Runnable expiryRunnable = new Runnable() {
        @Override
        public void run() {
            scheduledExpiryAt = 0L;
            updateNotificationForBreak();
            pollForeground();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(screenReceiver, filter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());
        lastForegroundPkg = "";
        currentForegroundPkg = "";
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(pollRunnable);
        handler.removeCallbacks(expiryRunnable);
        try {
            unregisterReceiver(screenReceiver);
        } catch (IllegalArgumentException ignored) {}
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void pollForeground() {
        if (!BlockerPrefs.isBlockingEnabled(this)) return;

        // The break is settled before the "same app as last time" guard below.
        // Staying in the unlocked app produces no new foreground event, so with
        // the expiry check further down the guard used to swallow it and the
        // block never came back until the user switched apps.
        endExpiredBreak();

        String seen = getForegroundPackage();
        if (seen != null) currentForegroundPkg = seen;

        String pkg = currentForegroundPkg;
        if (pkg.isEmpty()) return;
        if (pkg.equals(getPackageName())) {
            // Our own overlay (or the app) is in front, so whatever was blocked
            // is no longer on screen — forget it and judge it again if the user
            // goes back to it.
            lastForegroundPkg = "";
            return;
        }
        if (pkg.equals(lastForegroundPkg)) return;

        lastForegroundPkg = pkg;

        Set<String> blocked = BlockerPrefs.getBlockedPackages(this);
        if (!blocked.contains(pkg)) return;

        // A running break covers every blocked app, not just the one it was
        // started from — hopping from Facebook to Instagram is still the same
        // break, and still ends at the same minute.
        if (BlockerPrefs.isBreakActive(this)) return;

        launchOverlay(pkg);
    }

    /**
     * Drops an unlock whose break has run out and clears the dedupe marker, so
     * the app on screen gets judged again even though it never changed.
     */
    private void endExpiredBreak() {
        long until = BlockerPrefs.getUnlockUntil(this);
        if (until == 0 || until > System.currentTimeMillis()) return;
        BlockerPrefs.clearUnlock(this);
        lastForegroundPkg = "";
    }

    /** Posts the one-shot check for this break, replacing any earlier one. */
    private void scheduleBreakExpiryCheck(long unlockUntil) {
        if (unlockUntil == scheduledExpiryAt) return;
        handler.removeCallbacks(expiryRunnable);
        scheduledExpiryAt = 0L;
        long delay = unlockUntil - System.currentTimeMillis();
        if (delay <= 0) return;
        scheduledExpiryAt = unlockUntil;
        // A little past the mark: at exactly unlockUntil the stored deadline is
        // only just reached, and clock granularity could leave it unexpired.
        handler.postDelayed(expiryRunnable, delay + 250L);
    }

    private void launchOverlay(String blockedPackage) {
        Intent intent = new Intent(this, BlockOverlayActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra(BlockOverlayActivity.EXTRA_BLOCKED_PACKAGE, blockedPackage);
        startActivity(intent);
    }

    private String getForegroundPackage() {
        long now = System.currentTimeMillis();
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return null;
        UsageEvents events = usm.queryEvents(now - 10_000L, now);
        UsageEvents.Event e = new UsageEvents.Event();
        String pkg = null;
        while (events.hasNextEvent()) {
            events.getNextEvent(e);
            if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND
                    || e.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) {
                pkg = e.getPackageName();
            }
        }
        return pkg;
    }

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Skupienie aktywne", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Trwałe powiadomienie podczas aktywnej blokady aplikacji.");
        channel.setShowBadge(false);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent tap = new Intent(this, MainActivity.class);
        tap.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, tap, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setContentTitle("Skupienie aktywne")
                .setContentText("Blokada rozpraszających aplikacji jest włączona.")
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
    }

    private void updateNotificationForBreak() {
        long until = BlockerPrefs.getUnlockUntil(this);
        long now = System.currentTimeMillis();

        if (until > now) {
            breakNotificationActive = true;
            scheduleBreakExpiryCheck(until);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildBreakNotification(until));
            }
        } else if (breakNotificationActive) {
            breakNotificationActive = false;
            handler.removeCallbacks(expiryRunnable);
            scheduledExpiryAt = 0L;
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification());
            }
        }
    }

    private Notification buildBreakNotification(long unlockUntil) {
        Intent tap = new Intent(this, MainActivity.class);
        tap.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, tap, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        long now = System.currentTimeMillis();
        long remaining = Math.max(unlockUntil - now, 0);
        int progressMax = 1000;
        int progressCurrent = (int) (remaining * progressMax / BlockerPrefs.BREAK_DURATION_MS);
        if (progressCurrent > progressMax) progressCurrent = progressMax;

        // The chronometer below is the only countdown. A second one ticked by
        // hand here drifts against it — the system updates its own every second,
        // this one only when the poll happens to run — so the text states the
        // wall-clock time the block comes back and nothing else.
        String backAt = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(
                new Date(unlockUntil));

        NotificationCompat.ProgressStyle progressStyle = new NotificationCompat.ProgressStyle();
        progressStyle.addProgressSegment(
                new NotificationCompat.ProgressStyle.Segment(progressMax));
        progressStyle.setProgress(progressCurrent);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setContentTitle("Przerwa")
                .setContentText("Blokada wraca o " + backAt)
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(unlockUntil)
                .setRequestPromotedOngoing(true)
                // No short critical text: the status-bar chip then shows the
                // chronometer itself instead of a stale string we'd have to tick.
                .setStyle(progressStyle)
                .build();
    }

    private void scheduleNextPoll() {
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);
    }
}

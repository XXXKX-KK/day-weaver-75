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

import java.util.Set;

import pl.dzienlepszy.app.MainActivity;

public class BlockerForegroundService extends Service {

    private static final String CHANNEL_ID = "blocker_focus";
    private static final int NOTIFICATION_ID = 9001;
    private static final long POLL_INTERVAL_MS = 900L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private String lastForegroundPkg = "";
    private boolean screenOn = true;

    private final BroadcastReceiver screenReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                screenOn = true;
                scheduleNextPoll();
            } else if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                screenOn = false;
                handler.removeCallbacks(pollRunnable);
            }
        }
    };

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            pollForeground();
            if (screenOn) {
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
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
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(pollRunnable);
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

        String pkg = getForegroundPackage();
        if (pkg == null) return;
        if (pkg.equals(getPackageName())) return;
        if (pkg.equals(lastForegroundPkg)) return;

        lastForegroundPkg = pkg;

        Set<String> blocked = BlockerPrefs.getBlockedPackages(this);
        if (!blocked.contains(pkg)) return;

        if (BlockerPrefs.isUnlocked(this, pkg)) return;

        long until = BlockerPrefs.getUnlockUntil(this);
        if (until != 0 && until <= System.currentTimeMillis()) {
            BlockerPrefs.clearUnlock(this);
        }

        launchOverlay(pkg);
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

    private void scheduleNextPoll() {
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);
    }
}

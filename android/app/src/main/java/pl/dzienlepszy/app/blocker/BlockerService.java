package pl.dzienlepszy.app.blocker;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;

import java.util.Set;

/**
 * Watches which app is in the foreground. When blocking is enabled AND the
 * foreground package is on the blocked list, it throws up the full-screen
 * {@link BlockOverlayActivity}.
 *
 * Deliberately minimal for this milestone: no schedule, no breaks, no
 * foreground notification. Block condition == (service enabled by the user in
 * system settings) AND (blocking toggle on) AND (package on the list).
 */
public class BlockerService extends AccessibilityService {

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return;
        }
        CharSequence packageName = event.getPackageName();
        if (packageName == null) return;
        String pkg = packageName.toString();

        // Never react to our own windows (app + overlay) — prevents a loop.
        if (getPackageName().equals(pkg)) return;

        if (!BlockerPrefs.isBlockingEnabled(this)) return;

        Set<String> blocked = BlockerPrefs.getBlockedPackages(this);
        if (!blocked.contains(pkg)) return;

        launchOverlay(pkg);
    }

    private void launchOverlay(String blockedPackage) {
        Intent intent = new Intent(this, BlockOverlayActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra(BlockOverlayActivity.EXTRA_BLOCKED_PACKAGE, blockedPackage);
        startActivity(intent);
    }

    @Override
    public void onInterrupt() {
        // No-op: nothing to release between events.
    }
}

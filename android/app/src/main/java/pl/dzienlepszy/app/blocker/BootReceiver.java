package pl.dzienlepszy.app.blocker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        if (!BlockerPrefs.isBlockingEnabled(context)) return;

        Intent service = new Intent(context, BlockerForegroundService.class);
        ContextCompat.startForegroundService(context, service);
    }
}

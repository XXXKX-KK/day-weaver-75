package pl.dzienlepszy.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import pl.dzienlepszy.app.blocker.BlockerPlugin;
import pl.dzienlepszy.app.calendar.CalendarPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge is created.
        registerPlugin(BlockerPlugin.class);
        registerPlugin(CalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

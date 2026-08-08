package pl.dzienlepszy.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import pl.dzienlepszy.app.blocker.BlockerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge is created.
        registerPlugin(BlockerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

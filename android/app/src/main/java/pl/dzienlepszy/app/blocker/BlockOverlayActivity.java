package pl.dzienlepszy.app.blocker;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.WindowManager;
import android.widget.TextView;

import pl.dzienlepszy.app.MainActivity;
import pl.dzienlepszy.app.R;

/**
 * Full-screen "focus" screen shown when a blocked app is opened. Dark
 * background, accent, one motivational line and a placeholder for the current
 * task (wired to the real planner in a later milestone), plus one button that
 * returns to the app.
 */
public class BlockOverlayActivity extends Activity {

    public static final String EXTRA_BLOCKED_PACKAGE = "blocked_package";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_block_overlay);

        bindCurrentTask();
        findViewById(R.id.block_return_button).setOnClickListener(v -> returnToApp());
    }

    private void bindCurrentTask() {
        TextView taskView = findViewById(R.id.block_current_task);
        String task = BlockerPrefs.getCurrentTask(this);
        if (TextUtils.isEmpty(task)) {
            taskView.setText(R.string.block_overlay_current_task_fallback);
        } else {
            taskView.setText(getString(R.string.block_overlay_current_task_prefix, task));
        }
    }

    private void returnToApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    @Override
    public void onBackPressed() {
        // Back must not drop the user straight back into the blocked app.
        returnToApp();
    }
}

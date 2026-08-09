package pl.dzienlepszy.app.blocker;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import pl.dzienlepszy.app.MainActivity;
import pl.dzienlepszy.app.R;

/**
 * Calm, "breathing" focus screen shown when a blocked app is opened. A slowly
 * pulsing accent ring with a moon inside, the current task as the hero, a soft
 * accent glow, and one button back to the app. Accent colour comes from prefs
 * (accent_hex, written on the appearance screen); falls back to the app pink.
 */
public class BlockOverlayActivity extends Activity {

    public static final String EXTRA_BLOCKED_PACKAGE = "blocked_package";
    private static final int DEFAULT_ACCENT = 0xFFEE4261;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_block_overlay);

        applyAccent(resolveAccent());
        bindCurrentTask();
        startBreathing();
        findViewById(R.id.block_return_button).setOnClickListener(v -> returnToApp());
    }

    /** Parse the accent hex from prefs; any bad/empty value falls back to pink. */
    private int resolveAccent() {
        String hex = BlockerPrefs.getAccentHex(this);
        if (!TextUtils.isEmpty(hex)) {
            try {
                return Color.parseColor(hex.trim());
            } catch (IllegalArgumentException ignored) {
                // fall through to default
            }
        }
        return DEFAULT_ACCENT;
    }

    private void applyAccent(int accent) {
        tintBackground(R.id.block_bg_glow, accent);
        tintBackground(R.id.block_ring_glow, accent);
        tintBackground(R.id.block_ring, accent);
        tintBackground(R.id.block_return_button, accent);

        ImageView icon = findViewById(R.id.block_ring_icon);
        icon.setColorFilter(accent);

        // Keep the button label readable whether the accent is light or dark.
        Button button = findViewById(R.id.block_return_button);
        button.setTextColor(contrastColorFor(accent));
    }

    private void tintBackground(int viewId, int color) {
        Drawable background = findViewById(viewId).getBackground();
        if (background != null) {
            background.mutate().setTint(color);
        }
    }

    private int contrastColorFor(int color) {
        double luminance =
                (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color))
                        / 255.0;
        return luminance > 0.6 ? 0xFF12131A : 0xFFFFFFFF;
    }

    private void bindCurrentTask() {
        TextView eyebrow = findViewById(R.id.block_task_eyebrow);
        TextView title = findViewById(R.id.block_task_title);
        String task = BlockerPrefs.getCurrentTask(this);
        if (TextUtils.isEmpty(task)) {
            eyebrow.setVisibility(View.GONE);
            title.setText(R.string.block_overlay_current_task_fallback);
        } else {
            eyebrow.setVisibility(View.VISIBLE);
            title.setText(task);
        }
    }

    private void startBreathing() {
        View group = findViewById(R.id.block_breathe_group);
        Animation breathe = AnimationUtils.loadAnimation(this, R.anim.block_breathe);
        group.startAnimation(breathe);
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

package pl.dzienlepszy.app.blocker;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.text.TextUtils;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import java.util.Collections;
import java.util.List;

import pl.dzienlepszy.app.MainActivity;
import pl.dzienlepszy.app.R;

/**
 * Calm, "breathing" focus screen shown when a blocked app is opened. A slowly
 * pulsing accent ring with a moon inside, the current task as the hero, a soft
 * accent glow, and one button back to the app. Accent colour comes from prefs
 * (accent_hex, written on the appearance screen); falls back to the app blue.
 */
public class BlockOverlayActivity extends Activity {

    public static final String EXTRA_BLOCKED_PACKAGE = "blocked_package";
    private static final int DEFAULT_ACCENT = 0xFF3B82F6;

    /** Ordered not-done day-plan titles, loaded once when the overlay appears. */
    private List<String> dayTasks = Collections.emptyList();
    /** Which task is currently shown. In-memory only — a fresh overlay launch
     *  always starts at 0 (first not-done), and "Nie teraz" never persists. */
    private int taskIndex = 0;

    private String blockedPackage = "";
    private CountDownTimer breakTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_block_overlay);

        blockedPackage = getIntent().getStringExtra(EXTRA_BLOCKED_PACKAGE);
        if (blockedPackage == null) blockedPackage = "";

        dayTasks = BlockerPrefs.getDayTasks(this);
        taskIndex = 0;

        applyAccent(resolveAccent());
        bindTaskView();
        bindBreakButton();
        startBreathing();
        findViewById(R.id.block_return_button).setOnClickListener(v -> returnToApp());
        findViewById(R.id.block_skip_button).setOnClickListener(v -> skipToNext());
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (breakTimer != null) {
            breakTimer.cancel();
            breakTimer = null;
        }
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

        // Ghost secondary button — accent-tinted text on the dark background.
        Button skip = findViewById(R.id.block_skip_button);
        skip.setTextColor(accent);
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

    /**
     * Renders the current task. When the day plan has items, shows the one at
     * taskIndex and offers "Nie teraz" to move on (only if there's more than one
     * left). With no plan and no current_task, shows an "all done" state. With
     * no plan but a current_task set, falls back to that task.
     */
    private void bindTaskView() {
        TextView eyebrow = findViewById(R.id.block_task_eyebrow);
        TextView title = findViewById(R.id.block_task_title);
        TextView motivation = findViewById(R.id.block_motivation);
        Button skip = findViewById(R.id.block_skip_button);

        if (!dayTasks.isEmpty()) {
            if (taskIndex < 0 || taskIndex >= dayTasks.size()) taskIndex = 0;
            eyebrow.setVisibility(View.VISIBLE);
            title.setText(dayTasks.get(taskIndex));
            skip.setVisibility(dayTasks.size() > 1 ? View.VISIBLE : View.GONE);
            return;
        }

        skip.setVisibility(View.GONE);
        String task = BlockerPrefs.getCurrentTask(this);
        if (TextUtils.isEmpty(task)) {
            eyebrow.setVisibility(View.GONE);
            title.setText(R.string.block_overlay_all_done_title);
            motivation.setText(R.string.block_overlay_all_done_subtitle);
        } else {
            eyebrow.setVisibility(View.VISIBLE);
            title.setText(task);
        }
    }

    /** "Nie teraz": advance to the next task, wrapping around after the last.
     *  Purely in-memory — nothing is written to prefs or the database. */
    private void skipToNext() {
        if (dayTasks.size() < 2) return;
        taskIndex = (taskIndex + 1) % dayTasks.size();
        bindTaskView();
    }

    private void bindBreakButton() {
        Button breakBtn = findViewById(R.id.block_break_button);
        int used = BlockerPrefs.getBreakUsedToday(this);
        int limit = BlockerPrefs.getBreakDailyLimit(this);

        if (limit <= 0) {
            breakBtn.setVisibility(View.GONE);
            return;
        }

        breakBtn.setVisibility(View.VISIBLE);
        if (used >= limit) {
            breakBtn.setText(R.string.block_overlay_break_exhausted);
            breakBtn.setEnabled(false);
            breakBtn.setAlpha(0.4f);
        } else {
            breakBtn.setText(getString(R.string.block_overlay_break, used, limit));
            breakBtn.setOnClickListener(v -> startBreakCountdown());
        }
    }

    private void startBreakCountdown() {
        Button breakBtn = findViewById(R.id.block_break_button);
        breakBtn.setEnabled(false);

        int delaySec = BlockerPrefs.getBreakDelay(this);
        long delayMs = delaySec * 1000L;

        breakTimer = new CountDownTimer(delayMs, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int sec = (int) Math.ceil(millisUntilFinished / 1000.0);
                breakBtn.setText(getString(R.string.block_overlay_break_countdown, sec));
            }

            @Override
            public void onFinish() {
                BlockerPrefs.incrementBreakUsed(BlockOverlayActivity.this);
                BlockerPrefs.setUnlock(BlockOverlayActivity.this, blockedPackage);
                finish();
            }
        }.start();
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

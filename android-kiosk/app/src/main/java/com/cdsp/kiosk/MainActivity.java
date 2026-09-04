package com.cdsp.kiosk;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private FrameLayout rootView;
    private WebView webView;
    private ProgressBar progressBar;
    private View errorPanel;
    private TextView errorMessage;
    private boolean mainFrameLoadFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        setContentView(R.layout.activity_main);

        rootView = findViewById(R.id.page_root);
        webView = findViewById(R.id.web_view);
        progressBar = findViewById(R.id.loading_indicator);
        errorPanel = findViewById(R.id.error_panel);
        errorMessage = findViewById(R.id.error_message);
        Button retryButton = findViewById(R.id.retry_button);

        configureWebView();
        retryButton.setOnClickListener(view -> {
            ensureWebView();
            loadHome();
        });

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadHome();
        }
        enterImmersiveMode();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " CDSP-Kiosk/0.1.0");

        webView.setBackgroundColor(getColor(R.color.page_background));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        settings.setSafeBrowsingEnabled(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                // Avoid copying consultation content into Android logs.
                return true;
            }
        });
        webView.setWebViewClient(new TrustedWebViewClient());
    }

    private void loadHome() {
        ensureWebView();
        showLoading();
        webView.loadUrl(BuildConfig.WEB_APP_URL);
    }

    private void ensureWebView() {
        if (webView != null) return;
        webView = new WebView(this);
        webView.setId(R.id.web_view);
        rootView.addView(
            webView,
            0,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        );
        configureWebView();
    }

    private void releaseWebView(WebView view) {
        view.stopLoading();
        view.setWebChromeClient(null);
        view.setWebViewClient(null);
        rootView.removeView(view);
        view.destroy();
        if (webView == view) webView = null;
    }

    private boolean isTrustedNavigation(Uri uri) {
        Uri trusted = Uri.parse(BuildConfig.WEB_APP_URL);
        return trusted.getScheme() != null
            && trusted.getScheme().equalsIgnoreCase(uri.getScheme())
            && trusted.getHost() != null
            && trusted.getHost().equalsIgnoreCase(uri.getHost())
            && effectivePort(trusted) == effectivePort(uri);
    }

    private int effectivePort(Uri uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private void showLoading() {
        errorPanel.setVisibility(View.GONE);
        progressBar.setVisibility(View.VISIBLE);
        if (webView != null) webView.setVisibility(View.VISIBLE);
    }

    private void showContent() {
        progressBar.setVisibility(View.GONE);
        errorPanel.setVisibility(View.GONE);
        if (webView != null) webView.setVisibility(View.VISIBLE);
    }

    private void showError(String message) {
        progressBar.setVisibility(View.GONE);
        if (webView != null) webView.setVisibility(View.INVISIBLE);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
            return;
        }
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        enterImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) releaseWebView(webView);
        super.onDestroy();
    }

    private final class TrustedWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (isTrustedNavigation(request.getUrl())) return false;
            Toast.makeText(MainActivity.this, R.string.blocked_navigation, Toast.LENGTH_SHORT).show();
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            mainFrameLoadFailed = false;
            showLoading();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!mainFrameLoadFailed) showContent();
        }

        @Override
        public void onReceivedError(
            WebView view,
            WebResourceRequest request,
            WebResourceError error
        ) {
            if (!request.isForMainFrame()) return;
            mainFrameLoadFailed = true;
            showError(getString(R.string.load_failed, error.getDescription()));
        }

        @Override
        public void onReceivedHttpError(
            WebView view,
            WebResourceRequest request,
            WebResourceResponse errorResponse
        ) {
            if (!request.isForMainFrame()) return;
            mainFrameLoadFailed = true;
            showError(getString(R.string.http_failed, errorResponse.getStatusCode()));
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            mainFrameLoadFailed = true;
            releaseWebView(view);
            showError(getString(
                detail.didCrash() ? R.string.renderer_crashed : R.string.renderer_terminated
            ));
            return true;
        }
    }
}

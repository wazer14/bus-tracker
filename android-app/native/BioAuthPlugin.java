package com.wazer14.bustracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

// Fingerprint login: credentials are AES-GCM encrypted with a key that never leaves the
// Android Keystore, and decrypted only after a successful BiometricPrompt authentication.
@CapacitorPlugin(name = "BioAuth")
public class BioAuthPlugin extends Plugin {
    private static final String PREFS = "buspulse_bio";
    private static final String ALIAS = "buspulse_bio_key";

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).build());
        return g.generateKey();
    }

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    @PluginMethod
    public void available(PluginCall call) {
        int r = BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        JSObject out = new JSObject();
        out.put("ok", r == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(out);
    }

    @PluginMethod
    public void has(PluginCall call) {
        JSObject out = new JSObject();
        out.put("ok", prefs().contains("cred"));
        call.resolve(out);
    }

    @PluginMethod
    public void save(PluginCall call) {
        String u = call.getString("u"), p = call.getString("p");
        if (u == null || p == null) { call.reject("missing"); return; }
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key());
            byte[] ct = c.doFinal((u + "\n" + p).getBytes(StandardCharsets.UTF_8));
            prefs().edit()
                    .putString("cred", Base64.encodeToString(ct, Base64.NO_WRAP))
                    .putString("iv", Base64.encodeToString(c.getIV(), Base64.NO_WRAP))
                    .apply();
            call.resolve();
        } catch (Exception e) { call.reject("save_failed"); }
    }

    @PluginMethod
    public void unlock(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(getActivity(),
                    ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            try {
                                SharedPreferences sp = prefs();
                                if (!sp.contains("cred")) { call.reject("no_creds"); return; }
                                Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
                                c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(sp.getString("iv", ""), Base64.NO_WRAP)));
                                String s = new String(c.doFinal(Base64.decode(sp.getString("cred", ""), Base64.NO_WRAP)), StandardCharsets.UTF_8);
                                int i = s.indexOf('\n');
                                JSObject out = new JSObject();
                                out.put("u", s.substring(0, i));
                                out.put("p", s.substring(i + 1));
                                call.resolve(out);
                            } catch (Exception e) { call.reject("decrypt_failed"); }
                        }
                        @Override public void onAuthenticationError(int code, @NonNull CharSequence err) {
                            call.reject(code == BiometricPrompt.ERROR_USER_CANCELED
                                    || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                                    || code == BiometricPrompt.ERROR_CANCELED ? "cancelled" : "auth_error_" + code);
                        }
                        @Override public void onAuthenticationFailed() { /* prompt lets the user retry */ }
                    });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("BusPulse")
                    .setSubtitle("تسجيل الدخول بالبصمة")
                    .setNegativeButtonText("إلغاء")
                    .build();
            prompt.authenticate(info);
        });
    }

    @PluginMethod
    public void clear(PluginCall call) {
        prefs().edit().clear().apply();
        call.resolve();
    }
}

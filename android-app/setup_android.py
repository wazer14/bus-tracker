# Run after `npx cap add android`: adds the battery plugin, permissions, and the app icon.
import os, re, shutil, glob
root = os.path.dirname(os.path.abspath(__file__))
app = os.path.join(root, 'android', 'app', 'src', 'main')
pkgdir = os.path.join(app, 'java', 'com', 'wazer14', 'bustracker')
os.makedirs(pkgdir, exist_ok=True)
shutil.copy(os.path.join(root, 'native', 'BatteryOptPlugin.java'), pkgdir)
open(os.path.join(pkgdir, 'MainActivity.java'), 'w').write('''package com.wazer14.bustracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BatteryOptPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
''')
mf = os.path.join(app, 'AndroidManifest.xml')
s = open(mf, encoding='utf8').read()
perms = ['INTERNET','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION','FOREGROUND_SERVICE','FOREGROUND_SERVICE_LOCATION','POST_NOTIFICATIONS','WAKE_LOCK','REQUEST_IGNORE_BATTERY_OPTIMIZATIONS']
add = ''.join('    <uses-permission android:name="android.permission.%s" />\n' % p for p in perms if ('android.permission.%s"' % p) not in s)
s = s.replace('<application', add + '    <application', 1) if '<uses-permission' not in s else s.replace('</manifest>', add + '</manifest>')
open(mf, 'w', encoding='utf8').write(s)
icon = os.path.join(root, '..', 'icons', 'icon-192.png')
for d in glob.glob(os.path.join(app, 'res', 'mipmap-*')):
    if d.endswith('anydpi-v26'):
        shutil.rmtree(d); continue
    for n in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        shutil.copy(icon, os.path.join(d, n))
print('setup done')

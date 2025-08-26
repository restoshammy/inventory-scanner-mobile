import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Modal, Keyboard, TouchableWithoutFeedback, Vibration, ToastAndroid, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { scanAdjust, getHealth, getProductByBarcode } from './src/api';
import { getBackendUrl, setBackendUrl } from './src/config';

const BARCODE_TYPES = ['qr','ean13','ean8','upc_a','upc_e','code128','code39','code93','itf14','pdf417','aztec','datamatrix'] as const;

// tiny notifier (toast on Android, alert on iOS)
const notify = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(msg);
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('1');
  const [message, setMessage] = useState('');
  const [productName, setProductName] = useState('');
  const [qtyAfter, setQtyAfter] = useState<number | null>(null);
  const [health, setHealth] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getBackendUrl());
  const [lastType, setLastType] = useState<string>('');
  const [torch, setTorch] = useState<'on'|'off'>('off');
  const [zoom, setZoom] = useState(0); // 0..1

  // --- NEW: scan cooldown + duplicate guard
  const scanLockRef = React.useRef(false);
  const lastScanRef = React.useRef<{code: string; ts: number}>({ code: '', ts: 0 });

  useEffect(() => {
    (async () => {
      if (!permission?.granted) await requestPermission();
      setHealth(await getHealth());
    })();
  }, []);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const p = await getProductByBarcode(code).catch(()=>null);
      setProductName(p?.name || '');
    })();
  }, [code]);

  const onScan = (event: any) => {
    // ignore if locked
    if (scanLockRef.current) return;

    // Support both shapes:
    // 1) { type, data }
    // 2) { barcodes: [{ type, data | rawValue }] }
    let data = event?.data;
    let type = event?.type;
    if (!data && Array.isArray(event?.barcodes) && event.barcodes.length) {
      const b = event.barcodes[0];
      data = b?.rawValue || b?.data;
      type = b?.type || b?.format || type;
    }
    if (!data) return;

    const s = String(data);
    const now = Date.now();

    // ignore rapid duplicate of the same code within 2s
    if (lastScanRef.current.code === s && now - lastScanRef.current.ts < 2000) return;

    // lock scanning for 1.2s to prevent bursts
    scanLockRef.current = true;
    setTimeout(() => { scanLockRef.current = false; }, 1200);

    lastScanRef.current = { code: s, ts: now };
    setScanned(true);
    setCode(s);
    setLastType(String(type || ''));
    setMessage(`Scanned: ${s}`);

    // haptic only (NO popup here to avoid stacking alerts)
    Vibration.vibrate(60);

    // let the UI settle; we don't auto-unlock via scanned anymore (we use scanLockRef)
    setTimeout(() => setScanned(false), 900);
  };

  async function apply(sign: 1 | -1) {
    const n = Number(amount);
    if (!code) { setMessage('Scan a code first'); return; }
    if (!Number.isFinite(n) || n <= 0) { setMessage('Enter a positive amount'); return; }
    try {
      setMessage('Updating…');
      const res = await scanAdjust(code, sign * n);
      if (res?.ok) {
        const msg = sign > 0 ? `Added ${n}` : `Removed ${n}`;
        setMessage(msg);
        setQtyAfter(typeof res.qty === 'number' ? res.qty : null);

        // Popup only after successful update
        notify(`Success: ${msg}`);
      } else {
        setMessage('Update failed');
      }
    } catch (e: any) {
      setMessage(e?.message || 'Network error');
    } finally {
      Keyboard.dismiss();
    }
  }

  async function saveServerUrl() {
    setBackendUrl(serverUrl);
    const ok = await getHealth();
    setHealth(ok);
    setShowSettings(false);
  }

  if (!permission) {
    return <View style={styles.center}><Text>Requesting camera permissions…</Text></View>;
  }
  if (!permission.granted) {
    return <View style={styles.center}>
      <Text>We need your permission to use the camera</Text>
      <TouchableOpacity style={[styles.btn, styles.add, {marginTop:12}]} onPress={requestPermission}>
        <Text style={styles.btnText}>Grant permission</Text>
      </TouchableOpacity>
    </View>;
  }

  function clamp(v:number, min:number, max:number){ return Math.max(min, Math.min(max, v)); }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
            <Text style={styles.title}>Inventory Scanner</Text>
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Text style={{fontSize:18}}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.badge, health ? styles.ok : styles.bad]}>{health ? 'Server: OK' : 'Server: OFF'}</Text>
          <Text style={styles.url}>{getBackendUrl()}</Text>
        </View>

        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={onScan}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES as any }}
            facing="back"
            enableTorch={torch === 'on'}
            zoom={zoom}
            onCameraReady={() => setMessage('Aim the code inside the frame. Try Zoom + and Torch for small labels.')}
          />
          {/* overlay */}
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.frame} />
          </View>
          {/* controls over camera */}
          <View style={styles.cameraControls}>
            <TouchableOpacity style={[styles.smallBtn]} onPress={() => setZoom(z => clamp(z - 0.1, 0, 1))}><Text style={styles.smallBtnText}>Zoom −</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn]} onPress={() => setZoom(z => clamp(z + 0.1, 0, 1))}><Text style={styles.smallBtnText}>Zoom +</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn]} onPress={() => setTorch(t => t==='on'?'off':'on')}><Text style={styles.smallBtnText}>{torch==='on'?'Torch Off':'Torch On'}</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>Barcode</Text>
          <Text style={styles.mono}>{code || '—'}</Text>
          {!!productName && <Text style={styles.dim}>Item: {productName}</Text>}
          {!!lastType && <Text style={styles.dim}>Type: {lastType}</Text>}
          {qtyAfter !== null && <Text>Qty after: <Text style={styles.bold}>{qtyAfter}</Text></Text>}
        </View>

        <View style={styles.controls}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit
            style={styles.input}
            placeholder="1"
          />
          <TouchableOpacity style={[styles.btn, styles.remove]} onPress={() => apply(-1)}>
            <Text style={styles.btnText}>− Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.add]} onPress={() => apply(1)}>
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.message}>{message}</Text>
        </View>

        {/* Settings modal */}
        <Modal visible={showSettings} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={{fontSize:16,fontWeight:'700', marginBottom:8}}>Settings</Text>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrlState}
                placeholder="http://192.168.x.x:5000"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input,{width:'100%'}]}
              />
              <View style={{flexDirection:'row', justifyContent:'flex-end', gap:10, marginTop:12}}>
                <TouchableOpacity style={[styles.btn, {backgroundColor:'#e5e7eb'}]} onPress={() => setShowSettings(false)}>
                  <Text style={{color:'#111827', fontWeight:'700'}}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.add]} onPress={saveServerUrl}>
                  <Text style={styles.btnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <StatusBar style="auto" />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700' },
  badge: { marginTop: 4, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:2, borderRadius:12, overflow:'hidden', color:'#fff' },
  ok: { backgroundColor: '#16a34a' },
  bad: { backgroundColor: '#dc2626' },
  url: { marginTop: 4, color:'#6b7280', fontSize:12 },
  cameraWrap: { height: 380, margin: 16, borderRadius: 12, overflow: 'hidden', backgroundColor:'#000', position:'relative' },
  camera: { flex: 1 },
  overlay: { position:'absolute', inset:0, alignItems:'center', justifyContent:'center' },
  frame: { width: 240, height: 160, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 8 },
  cameraControls: { position:'absolute', bottom:10, left:10, right:10, flexDirection:'row', gap:8, justifyContent:'center' },
  smallBtn: { backgroundColor:'rgba(17,24,39,0.8)', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  smallBtnText: { color:'#fff', fontWeight:'700', fontSize:12 },
  info: { paddingHorizontal: 16, gap: 4 },
  label: { color:'#6b7280', fontSize:12 },
  mono: { fontFamily: 'monospace', fontSize: 16 },
  dim: { color:'#6b7280' },
  controls: { flexDirection: 'row', flexWrap:'wrap', alignItems: 'center', gap: 8, padding: 16 },
  input: { width: 90, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor:'#fff' },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  add: { backgroundColor: '#10b981' },
  remove: { backgroundColor: '#ef4444' },
  btnText: { color:'#fff', fontWeight: '700' },
  footer: { padding:16, minHeight: 48 },
  message: { color:'#111827' },
  bold: { fontWeight: '700' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', alignItems:'center', justifyContent:'center', padding:16 },
  modalCard: { width:'100%', maxWidth:420, backgroundColor:'#fff', borderRadius:12, padding:16 }
});

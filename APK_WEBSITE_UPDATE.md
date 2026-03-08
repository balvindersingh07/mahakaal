# APK & Website Update – Simple Steps

---

## 🎯 Kya setup hai

1. **mahakaalweb** – website jethi user APK download kare  
2. **Mahakaal.apk** – `mahakaalweb/public/Mahakaal.apk` ma store che  
3. Website par badha Download buttons **yeh file** par point kare che  

---

## ✅ Nava APK banavyo to kya karvu?

### Step 1: APK banao
```bash
cd Mahakaal-rn
eas build --profile production --platform android
```
- Build complete thay pachhi download link mile  
- APK file download karo  

### Step 2: Website ma APK replace karo
- Downloaded APK **copy** karo  
- `mahakaalweb/public/` folder ma paste karo  
- Old **Mahakaal.apk** ko **replace** karo (same name rakhvu)  

### Step 3: Website deploy karo
```bash
cd mahakaalweb
npm run build
```
- Pachi jo hosting use karo (Netlify, Vercel, etc.) te deploy karo  

**Bas. Nava APK download link same rehse – `/Mahakaal.apk`**

---

## 📁 Folder structure

```
mahakaalweb/
  public/
    Mahakaal.apk   ← Yaha nava APK rakho (purano replace karo)
```

---

## ❓ Common questions

**Q: APK_DOWNLOAD_URL change karvu pade?**  
A: Nahi. File name same rakhse to URL same rehse.  

**Q: EAS build karo ke local build?**  
A: EAS build recommended – OTA update support mate.  

**Q: OTA update matlab?**  
A: Jo bane APK EAS thi banavyo hoy to, nava APK na bina bhi JS/UI changes OTA thi push kari shakasho.

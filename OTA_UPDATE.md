# OTA (Over-The-Air) Updates – Mahakaal

User ane Admin dono apps ma EAS Update configure thay che. Nava APK download karta bina JS/asset changes push kari shako.

---

## Important

**OTA tabhi kaam kare che jyare APK EAS Build thi banayel hoy** – `eas build` thi. Local/manual build ma OTA nahi chalay.

Pehla jo APK EAS Build thi banaveli hoy, pachi j `eas update` thi OTA push kari shako.

---

## User App (Mahakaal-rn)

```bash
cd Mahakaal-rn

# Production users la update moklavo
npm run update:production

# Ya directly:
eas update --channel production --message "Bug fix / new feature"
```

---

## Admin App (Mahakaal-admin-rn)

```bash
cd Mahakaal-admin-rn

# Production admins la update moklavo
npm run update:production

# Ya directly:
eas update --channel production --message "Admin update"
```

---

## Channels

| Channel    | Use                      |
|-----------|---------------------------|
| `preview` | Testing / internal users  |
| `production` | Live users / admins   |

Preview APK `preview` channel no update leva lagse, Production APK `production` channel no.

---

## Flow

1. User/Admin app open kare
2. App startup par update check thay
3. Nava update male to download thay
4. App **restart** (close + open) pachi nava code load thay

---

## Pehli vaar setup

1. `eas login` – Expo account thi login
2. `eas build --profile production --platform android` – APK banao
3. J APK install karse, pachi `eas update --channel production` run karo to OTA update apply thase

/**
 * Admin Notification Hook
 * - Polls for new: deposit requests, payment/withdraw requests, bets
 * - Plays sound + vibration when new activity detected (app open)
 * - Registers push token for notifications when app is closed/background
 */
import { useEffect, useRef } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api, getAdminToken } from "./api";

const POLL_INTERVAL_MS = 20000; // 20 seconds
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869-ping-notification.mp3";

type LastSeen = {
  pendingDeposits: number;
  pendingPaymentRequests: number;
  newestBetId: string | null;
  initialized: boolean;
};

export function useAdminNotifications(enabled: boolean) {
  const lastSeen = useRef<LastSeen>({
    pendingDeposits: 0,
    pendingPaymentRequests: 0,
    newestBetId: null,
    initialized: false,
  });
  const soundRef = useRef<Audio.Sound | null>(null);

  const playNotification = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: NOTIFICATION_SOUND_URL },
          { shouldPlay: true }
        );
        soundRef.current = sound;
      }
    } catch {
      // fallback: at least haptics ran above
    }
  };

  useEffect(() => {
    if (!enabled || !getAdminToken()) return;

    const registerPushToken = async () => {
      if (!Device.isDevice) return;
      if (Constants.appOwnership === "expo") return; // Push removed from Expo Go SDK 53
      try {
        const Notifications = await import("expo-notifications");
        const { status: existing } = await Notifications.getPermissionsAsync();
        let final = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          final = status;
        }
        if (final !== "granted") return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData?.data;
        if (token) await api.registerPushToken(token);
      } catch (e) {
        console.log("[notifications] push register failed", e);
      }
    };
    registerPushToken();

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch {}
    };
    setupAudio();

    const poll = async () => {
      try {
        const [depRes, prRes, betsRes] = await Promise.all([
          api.deposits({ status: "pending" }).catch(() => ({ deposits: [], items: [] })),
          api.paymentRequests({ status: "pending" }).catch(() => ({ items: [], rows: [] })),
          api
            .bets({
              limit: "30",
              from: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            })
            .catch(() => ({ rows: [], bets: [] })),
        ]);

        const deposits = depRes?.deposits ?? depRes?.items ?? [];
        const prs = prRes?.items ?? prRes?.rows ?? prRes?.requests ?? [];
        const bets = betsRes?.rows ?? betsRes?.bets ?? betsRes?.items ?? [];

        const pendingDeposits = Array.isArray(deposits) ? deposits.length : 0;
        const pendingPaymentRequests = Array.isArray(prs) ? prs.length : 0;
        const sortedBets = Array.isArray(bets)
          ? [...bets].sort(
              (a: any, b: any) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            )
          : [];
        const newestBet = sortedBets[0];
        const newestBetId = newestBet?._id ? String(newestBet._id) : null;

        const prev = lastSeen.current;

        if (prev.initialized) {
          if (pendingDeposits > prev.pendingDeposits) {
            await playNotification();
          }
          if (pendingPaymentRequests > prev.pendingPaymentRequests) {
            await playNotification();
          }
          if (
            newestBetId &&
            (newestBetId !== prev.newestBetId || !prev.newestBetId)
          ) {
            await playNotification();
          }
        }

        lastSeen.current = {
          pendingDeposits,
          pendingPaymentRequests,
          newestBetId: newestBetId || prev.newestBetId,
          initialized: true,
        };
      } catch (e) {
        console.log("[notifications] poll error", e);
      }
    };

    poll(); // run immediately
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [enabled]);
}

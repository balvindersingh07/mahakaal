/**
 * Admin Push Notification Service
 * Sends push via Expo Push API when: deposit, payment/withdraw request, new bet
 */
const tokens = new Set();

function addToken(token) {
  if (token && typeof token === "string" && token.startsWith("ExponentPushToken[")) {
    tokens.add(token);
  }
}

function getTokens() {
  return Array.from(tokens);
}

async function sendToAdmin(title, body) {
  const list = getTokens();
  if (!list.length) return;

  const messages = list.map((t) => ({
    to: t,
    sound: "default",
    title,
    body,
    priority: "high",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const data = await res.json();
    if (data?.data) {
      data.data.forEach((r, i) => {
        if (r?.status === "error" && r?.message?.includes("DeviceNotRegistered")) {
          tokens.delete(list[i]);
        }
      });
    }
  } catch (e) {
    console.error("[adminPush] send failed:", e?.message || e);
  }
}

module.exports = {
  addToken,
  getTokens,
  sendToAdmin,
};

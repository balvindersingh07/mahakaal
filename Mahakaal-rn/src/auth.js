import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveSession = async ({ token, user }) => {
  await AsyncStorage.multiSet([
    ["token", token],
    ["user", JSON.stringify(user)],
  ]);
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(["token", "user"]);
};

export const getUser = async () => {
  const raw = await AsyncStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

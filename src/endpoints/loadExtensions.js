export const loadExtensions = async () => {

  try {
    let url = import.meta.env.VITE_OVERRIDE_EXTENSION_DATA_URL ?? `/extension-data.json`;
    console.log('loadExtension url', url);
    if (import.meta.env.VITE_NYNO_DEV_UNSAFE_AUTO_SET_EXT_DATA_URL ?? false) {
      url = import.meta.env.VITE_NYNO_DEV_UNSAFE_AUTO_SET_EXT_DATA_URL;
      console.log('loadExtension url+import', url);
    }
    

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load extensions");

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error loading extensions:", err);
    return {};
  }
};

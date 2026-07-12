export const loadWorkflowByFilepath = async (newData) => {

  const HTTP_EXECUTOR_URL = import.meta.env.VITE_HTTP_EXECUTOR_URL;
  const {NYNO_API_KEY, filepath} = newData;

  const res = await fetch(
    HTTP_EXECUTOR_URL + `/files/${filepath}?mode=text`,
    {
      headers: {
        Authorization: NYNO_API_KEY,
      },
    }
  );

  const data = await res.json();
  if (!data.text) throw new Error("Invalid workflow file");

  return data.text;
};

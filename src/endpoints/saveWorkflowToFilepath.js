export const saveWorkflowToFilepath = async (newData) => {
  if (newData == null) return false;

  const HTTP_EXECUTOR_URL = import.meta.env.VITE_HTTP_EXECUTOR_URL;

  const { NYNO_API_KEY } = JSON.parse(JSON.stringify(newData));
  delete newData['NYNO_API_KEY'];

  console.log('calling savefiles with newData:', newData);
  await fetch(HTTP_EXECUTOR_URL + "/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": NYNO_API_KEY,
    },
    body: JSON.stringify(newData),
  });
};

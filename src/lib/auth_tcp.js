export default function auth(data) {
  if (!data || data.apiKey !== 'changeme') {
    return false;
  }

  return true;
}


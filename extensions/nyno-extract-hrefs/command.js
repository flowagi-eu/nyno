// Nyno-compatible href extractor transformer
export function nyno_extract_hrefs(args, context) {
  let list = args[0];
  const includeFilter = args[1]; // optional string to filter links

  // if its a single value make it a list anyway
  if (!Array.isArray(list)) {
    list = [list];
  }

  // Helper to extract all href links in a string
  const extractLinks = str => {
    const links = [];
    let startIndex = 0;

    while (true) {
      const hrefIndex = str.indexOf('href=', startIndex);
      if (hrefIndex === -1) break;

      const quoteStart = hrefIndex + 5; // skip 'href='
      const quoteChar = str[quoteStart]; // should be ' or "
      if (quoteChar !== '"' && quoteChar !== "'") {
        startIndex = quoteStart + 1;
        continue; // skip invalid format
      }

      const urlStart = quoteStart + 1;
      const urlEnd = str.indexOf(quoteChar, urlStart);
      if (urlEnd === -1) break;

      const link = str.substring(urlStart, urlEnd);
      // Apply include filter if specified
      if (!includeFilter || link.includes(includeFilter)) {
        links.push(link);
      }

      startIndex = urlEnd + 1;
    }

    return links;
  };

  // Apply extraction to all items in the list and flatten results
  const output = list.flatMap(item => {
    if (typeof item !== "string") item = JSON.stringify(item);
    return extractLinks(item);
  });

  let setName = 'prev';
  if ('set_context' in context) {
    setName = context['set_context'];
  }

  const uniqueOutput = [...new Set(output)];

  context[setName] = uniqueOutput;
  return 0;
}


export async function hello_ts(
  args: string[],
  context: Record<string, any>
): Promise<number> { // changed from Promise<string> to Promise<number>
  const name = args[0] || "World";
  context['custom_ts_var'] = 'ts';
  return 0; // now matches the return type
}

// extensions/hello/command.js
export function hello(args, context) {
  const name = args[0] || "World";
  context['custom_js_var'] = 'js';
  return `Hello, ${name}!`;
}
import { execFile } from 'child_process';

export async function nyno_notify(args, context) {
	let setName = context['set_context'] ?? 'prev';
  const title = args[0];
  const subTitle = args[1] ?? '';

  try {
    await new Promise((resolve, reject) => {
      execFile('notify-send', [title, subTitle], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return 0; // success
  } catch (err) {
	  context[setName + '.error'] = String(err);
    console.error('Notification failed:', err);
    return 1; // error
  }
}

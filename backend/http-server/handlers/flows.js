export async function flows(ctx, req) {
  console.log('POST flows req.body', req.body)
  const { workflow, context } = req.body;

  try {
    const status = "pending";
    const obj = {
      status,
      result: null,
    };

    obj.json = { workflow, context };
    const taskId = await ctx.createTask(obj, ctx);
    return [200, { taskId }];
  } catch (err) {
    return [500, { err: String(err) }];
  }
}


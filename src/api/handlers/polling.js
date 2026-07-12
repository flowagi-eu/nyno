
export async function polling(ctx, req) {
    try {
        const { taskId } = req.params;

        const task = ctx.getTask(taskId);

        if (!task) {
            return [404, { error: "task not found" }];
        }

        return [
            200,
            {
                taskId,
                status: task.status,
                result: task.result,
            },
        ];
    } catch (err) {
        return [
            500,
            {
                err: String(err)
            },
        ];
    }

}
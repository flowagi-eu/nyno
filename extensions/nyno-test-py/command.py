def nyno_test_py(args, context=None):
    if context is None:
        context = {}

    if not args:
        return 0

    context["prev"] = args[0]
    return 0

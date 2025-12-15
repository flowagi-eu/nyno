# Nyno extensions hello-py
def hello_py(args, context):
    name = args[0] if args else "World"
    context['custom_py_var'] = 'py'
    context['prev'] = f"Hello, {name} from Python!"
    return 0

# extensions/hello-py/command.py
def hello_py(args, context):
    name = args[0] if args else "World"
    context['custom_py_var'] = 'py'
    return f"Hello, {name} from Python!"
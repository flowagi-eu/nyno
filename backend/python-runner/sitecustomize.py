# sitecustomize.py
import builtins
from beartype import beartype

# Inject the name into builtins so EVERY .py file sees it
builtins.CheckAtRuntime = beartype

# Optional: remove this print if you want silence
print("🔧 @CheckAtRuntime enabled globally")

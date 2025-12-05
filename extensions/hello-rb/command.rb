def hello_rb(args, context)
  name = args && args[0] ? args[0] : "World"
  context["custom_ruby_var"] = "ruby"
  context["prev"] = "ruby"
  "Hello, #{name} from Ruby!"
end


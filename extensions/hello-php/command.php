<?php
// extensions/hello-php/command.php
function hello_php($args, &$context) {
    $name = $args[0] ?? "World";
    $context['custom_php_var'] = 'php';
    return "Hello, $name from PHP!";
}
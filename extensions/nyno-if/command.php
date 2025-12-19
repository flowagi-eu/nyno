#!/usr/bin/env php
<?php
/**
 * Ultra-simple natural language if evaluator
 *
 * Usage:
 *   if_eval "10 is lower than 5"
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function nyno_if($args, &$context)
{
    $setName = $context["set_context"] ?? "prev";

    if (count($args) < 1) {
        $context[$setName.'.usage'] =
            'Usage: if_eval "10 is lower than 5"' . "\n";
        return 1;
    }

    $input = strtolower(trim($args[0]));

    // Extract numbers
    if (!preg_match('/(-?\d+(?:\.\d+)?).+?(-?\d+(?:\.\d+)?)/', $input, $m)) {
        $context[$setName.'.error'] = "Could not extract numbers from input";
        return 1;
    }

    $left  = $m[1] + 0;
    $right = $m[2] + 0;

    $result = false;

    // Detect condition
    if (str_contains($input, 'lower than') || str_contains($input, 'less than')) {
        $result = $left < $right;

    } elseif (str_contains($input, 'higher than') || str_contains($input, 'greater than')) {
        $result = $left > $right;

    } elseif (str_contains($input, 'equal to') || str_contains($input, 'equals')) {
        $result = $left == $right;

    } elseif (str_contains($input, 'not equal')) {
        $result = $left != $right;

    } else {
        $context[$setName.'.error'] = "Unknown condition in input";
        return 1;
    }

    $context[$setName] = $result ? 1 : 0;

    return 0;
}


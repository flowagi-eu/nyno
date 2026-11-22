<?php

function hasQuotedPair(string $input): bool
{
    return preg_match('/(["\'])(.*?)\1.+?(["\'])(.*?)\3/', $input) === 1;
}

function parseQuotedPair(string $input): ?array
{
    if (preg_match('/(["\'])(.*?)\1.+?(["\'])(.*?)\3/', $input, $m)) {
        return [$m[2], $m[4]];
    }

    return null;
}

function parseNumberPair(string $input): ?array
{
    if (preg_match('/(-?\d+(?:\.\d+)?).+?(-?\d+(?:\.\d+)?)/', $input, $m)) {
        return [(float)$m[1], (float)$m[2]];
    }

    return null;
}

function evaluateCondition(string $input, $left, $right): ?bool
{
    if (str_contains($input, 'contains')) {
        return str_contains((string)$left, (string)$right);
    }
    
    
    if (str_contains($input, 'not starts with')) {
        return !(str_starts_with((string)$left, (string)$right));
    }
    
    if (str_contains($input, 'starts with')) {
        return str_starts_with((string)$left, (string)$right);
    }

    if (str_contains($input, 'lower than') || str_contains($input, 'less than')) {
        return $left < $right;
    }

    if (str_contains($input, 'higher than') || str_contains($input, 'greater than')) {
        return $left > $right;
    }

    if (str_contains($input, 'not equal') || str_contains($input, 'not equal to') || str_contains($input, 'is not')) {
        return $left != $right;
    }
    else if (str_contains($input, 'equal to') || str_contains($input, 'equals') || str_contains($input, 'is')) {
        return $left == $right;
    }

    

    return null;
}

function nyno_if(array $args, array &$context)
{
    $setName = $context["set_context"] ?? "prev";

    if (count($args) < 1) {
        $context[$setName . '.usage'] =
            'Usage: if_eval "10 is lower than 5"' . "\n";
        return -1;
    }

    	$left = $args[0];
    	$input = strtolower($args[1]);
    

    	$right = $args[2];

    	
    	if (is_numeric($left)) {
    		$left += 0; // convert to int/float
    	}
    	if (is_numeric($right)) {
    		$right += 0; // convert to int/float
    	}
   

    $context[$setName . '.left']  = $left;
    $context[$setName . '.right'] = $right;

    $result = evaluateCondition($input, $left, $right);

    if ($result === null) {
        $context[$setName . '.error'] =
            "Unknown condition in input";
        return -1;
    }

    $context[$setName] = $result ? 0 : 1;
    return $context[$setName];
}

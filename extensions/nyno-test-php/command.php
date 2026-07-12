<?php
function nyno_test_php($args, &$context = null)
{
    if ($context === null) {
        $context = [];
    }

    $context['prev'] = $args[0];
    return 0;
}

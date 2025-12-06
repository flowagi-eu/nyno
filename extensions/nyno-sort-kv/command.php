<?php
function nyno_sort_kv(array $args, array &$context): int
{
    // Determine output variable name
    $setName = array_key_exists('set_context', $context)
        ? $context['set_context']
        : 'prev';

    try {
        // args[0] = object to sort
        $obj = $args[0] ?? null;

        if (!is_array($obj)) {
            $context[$setName . '.error'] = [
                'error' => 'args[0] must be an object'
            ];
            return 1;
        }

        // args[1] = "asc" or "desc"
        $order = strtolower($args[1] ?? 'asc');

        // Convert associative array → list of [key, value]
        $entries = [];
        foreach ($obj as $key => $value) {
            $entries[] = [$key, $value];
        }

        // Sort entries
        usort($entries, function ($a, $b) use ($order) {
            $av = (float) $a[1];
            $bv = (float) $b[1];

            if ($order === 'desc') {
                return $bv <=> $av;
            }

            return $av <=> $bv;
        });

        // Store sorted list in context
        $context[$setName] = $entries;

        return 0;
    } catch (Throwable $err) {
        $context[$setName . '.error'] = [
            'error' => $err->getMessage()
        ];
        return 2;
    }
}


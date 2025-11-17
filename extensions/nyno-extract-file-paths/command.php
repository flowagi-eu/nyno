#!/usr/bin/env php
<?php
/**
 * Extract absolute file paths from list of String messages and set context['fs_matches'].
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function nyno_extract_file_paths($args, &$context) {
    $filePaths = [];
    // This pattern matches paths starting with / or ~/ and captures quoted paths
    $pattern = '/(?:^|\s)(?:\"([^\"]+)\"|\'([^\']+)\'|(\/[^\s]+)|(~\/[^\s]+))/';

    foreach ($args as $message) {
        preg_match_all($pattern, $message, $matches);
        // Flatten the matches array and filter out empty strings
        $paths = array_filter(array_merge($matches[1], $matches[2], $matches[3], $matches[4]));
        $filePaths = array_merge($filePaths, $paths);
    }

    //$context['file_paths'] = $filePaths;
    if (!empty($filePaths)) {
        $context['fs_matches'] = $filePaths;
        return 0;
    } else {
        return 1;
    }
}

// Example usage:
// $context = [];
// $args = [
//     'Message 1 with /file/path/abslute.png',
//     'Message 2 "/file/some directory/test.txt"',
//     'Message 3 with directory as well: /etc/var',
//     'Message 4 with home dir too : ~/Workflows/test'
// ];
// $result = extract_file_paths($args, $context);
// if ($result === 0) {
//     print_r($context['fs_matches']);
// } else {
//     echo "No file paths found.\n";
// }


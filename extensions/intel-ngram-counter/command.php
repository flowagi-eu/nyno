<?php
// extensions/ngram-counter/command.php

function intel_ngram_counter($args, &$context) {
    // --- Step 1: Get text input ---
    var_dump('inside php intel ngram counter');
        $setName = $context['set_context'] ?? 'prev';
    $text = $args[0] ?? '';
    if(!$text){
        $context[$setName.'.error'] = ['errorMessage' => 'No text input provided'];
        return -1;
    }

    if(!is_string($text)){
        $context[$setName.'.error'] = ['errorMessage' => 'Text is not a string'];
        return -1;
    }

    //$text = substr($text,0,1000); // limit to n chars 

    // --- Step 2: Get n from args (default 2) ---
    $n = $args[1] ?? 2;
    if($n < 1){
        $context[$setName.'.error'] = ['errorMessage' => 'Invalid n value'];
        return -1;
    }

    try {
        // --- Step 3: Split text into words ---
        $words = preg_split('/\W+/',$text,-1,PREG_SPLIT_NO_EMPTY);

        // --- Step 4: Generate n-grams ---
        $ngrams = [];
        $count = count($words);
        for($i=0;$i<=$count-$n;$i++){
            $ng = strtolower(implode(' ', array_slice($words,$i,$n)));

            // prevent very long strings
            $ng = substr($ng,0,30);

            if(isset($ngrams[$ng])) $ngrams[$ng]++;
            else $ngrams[$ng]=1;
        }

        // --- Step 5: Store result in context ---
        $context[$setName] = $ngrams;
    } catch(Exception $e){
        $context[$setName.'.error'] = $e->getMessage();

        return -1;
    }

    return 0;
}


// --- Direct File Execution Check ---
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'])) {
    if (!isset($argv[1]) || !is_file($argv[1])) {
        echo "Usage: php command.php [filename] [n]\n";
        exit(1);
    }

    $file = $argv[1];
    $n = isset($argv[2]) ? (int)$argv[2] : 2;

    $text = file_get_contents($file);
    $context = [];
    $args = [$text, $n];

    $res = intel_ngram_counter($args, $context);


    echo json_encode($context, JSON_PRETTY_PRINT) . "\n";
}
?>

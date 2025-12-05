<?php
// extensions/phrase-classifier/command.php

function intel_classifier_leader_vs_agency($args, &$context) {

        $setName = $context['set_context'] ?? 'prev';
    // --- Step 1: Get raw text input ---
    $text = $args[0] ?? '';
    if(!$text){
        $context[$setName.'.error'] = ['errorMessage' => 'No text input provided'];
        return 1;
    }

    // --- Step 2: Define phrase embeddings (2-word and 3-word), adding 20+ more 2-word phrases ---
    $phrase_embeddings = [
        'ai platform' => [0.95, 0.1, 0.05],
        'enterprise software' => [0.9, 0.1, 0.0],
        'proprietary tech' => [0.92, 0.08, 0.0],
        'innovation startup' => [0.89, 0.45, 0.0],
        'cloud computing' => [0.93,0.05,0.02],
        'machine learning' => [0.94,0.06,0.01],
        'enterprise cloud' => [0.91,0.09,0.0],
        'software development' => [0.9,0.1,0.05],
        'high value' => [0.88,0.12,0.0],
        'product innovation' => [0.92,0.08,0.0],
        'ai software' => [0.95,0.08,0.02],
        'tech solution' => [0.91,0.09,0.0],
        'digital platform' => [0.93,0.07,0.0],
        'cloud solution' => [0.9,0.1,0.0],
        'data platform' => [0.94,0.06,0.0],
        'automation tool' => [0.92,0.08,0.0],
        'business platform' => [0.91,0.09,0.0],
        'software company' => [0.9,0.1,0.05],
        'tech innovation' => [0.93,0.07,0.0],
        'ai tool' => [0.95,0.05,0.0],
        'marketing agency' => [0.0, 0.9, 0.1],
        'consulting services' => [0.0, 0.85, 0.2],
        'design solutions' => [0.0, 0.8, 0.3],
        'digital marketing' => [0.0,0.88,0.12],
        'creative design' => [0.0,0.82,0.25],
        'business consulting' => [0.0,0.86,0.15],
        'branding design' => [0.0,0.8,0.25],
        'marketing strategy' => [0.0,0.87,0.13],
        'technology consulting' => [0.0,0.85,0.2],
        'client services' => [0.0,0.88,0.1],
        'design team' => [0.0,0.8,0.3],
        'creative agency' => [0.0,0.83,0.25],
        'digital solutions' => [0.0,0.86,0.15],
        'consulting firm' => [0.0,0.85,0.2],
        'business solutions' => [0.0,0.84,0.18],
        'marketing firm' => [0.0,0.87,0.12],
        'branding agency' => [0.0,0.82,0.25],
        'software solutions' => [0.91,0.09,0.0],
    ];

    // --- Step 3: Split text into sentences ---
    $sentences = preg_split('/(?<=[.?!\n])\s+/',$text,-1,PREG_SPLIT_NO_EMPTY);

    // --- Step 4: Generate n-grams ---
    $ngrams_fn = function($sentence, $n){
        $words = preg_split('/\W+/', $sentence, -1, PREG_SPLIT_NO_EMPTY);
        $out = [];
        $count = count($words);
        for($i=0;$i<=$count-$n;$i++){
            $out[] = strtolower(implode(' ', array_slice($words,$i,$n)));
        }
        return $out;
    };

    // --- Step 5: Compute sentence vector ---
    $sentence_vector_fn = function($sentence) use ($phrase_embeddings, $ngrams_fn){
        $vec = [0.0,0.0,0.0];
        $all_ngrams = array_merge($ngrams_fn($sentence,3), $ngrams_fn($sentence,2));
        foreach($all_ngrams as $ng){
            if(isset($phrase_embeddings[$ng])){
                $p = $phrase_embeddings[$ng];
                $vec[0]+=$p[0]; $vec[1]+=$p[1]; $vec[2]+=$p[2];
            }
        }
        return $vec;
    };

    // --- Step 6: Compute document vector ---
    $doc_vec = [0.0,0.0,0.0];
    foreach($sentences as $s){
        $sv = $sentence_vector_fn($s);
        $doc_vec[0]+=$sv[0]; $doc_vec[1]+=$sv[1]; $doc_vec[2]+=$sv[2];
    }
    $num_sentences = count($sentences);
    $doc_vec = array_map(fn($v)=>$v/$num_sentences, $doc_vec);

    // --- Step 7: Prototypes ---
    $tech_proto=[1.0,0.0,0.0];
    $agency_proto=[0.0,1.0,0.0];

    // --- Step 8: Cosine similarity ---
    $cosine_similarity = function($v1,$v2){
        $dot=0.0;$n1=0.0;$n2=0.0;
        for($i=0;$i<count($v1);$i++){
            $dot+=$v1[$i]*$v2[$i];
            $n1+=$v1[$i]*$v1[$i];
            $n2+=$v2[$i]*$v2[$i];
        }
        return $dot/(sqrt($n1)*sqrt($n2));
    };

    $sim_tech = $cosine_similarity($doc_vec,$tech_proto);
    $sim_agency = $cosine_similarity($doc_vec,$agency_proto);

    // --- Step 9: Set result object in context ---
    $context[$setName] = [
        'document_vector'=>$doc_vec,
        'similarity_to_tech'=>$sim_tech,
        'similarity_to_agency'=>$sim_agency,
        'prediction'=>$sim_tech>$sim_agency ? 'Tech Leader':'Agency'
    ];

    return 0;
}
?>


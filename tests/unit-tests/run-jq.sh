# make sure shows right exit code even after using jq
node run.js | jq; exit_code=${PIPESTATUS[0]}; exit $exit_code

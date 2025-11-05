#!/bin/bash
source envs/ports.env
source .venv/bin/activate
bestjsserver --prod --tcp "$WF" --port "$GU" --host "$HOST"


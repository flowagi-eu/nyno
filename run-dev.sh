#!/bin/bash
source envs/ports.env
source .venv/bin/activate
bestjsserver --tcp "$WF" --port "$GU" --host "$HOST"

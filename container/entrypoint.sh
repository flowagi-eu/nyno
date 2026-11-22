#!/bin/bash
APP_ENV=${APP_ENV:-dev}  # default to dev if not set
exec ./start-devserver.sh

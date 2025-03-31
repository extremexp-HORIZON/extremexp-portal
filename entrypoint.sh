#!/bin/bash

if [ -f .env ]; then
   source .env
else
   echo ".env file not found."
   exit;
fi

#docker compose -f docker-compose.yaml up --build --detach
docker compose -f docker-compose.yaml up --build
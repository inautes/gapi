#!/bin/bash

echo "Testing /download/contents API..."

curl -X POST http://localhost:3000/download/contents \
  -H "Content-Type: application/json" \
  -d '{
    "cont_id": 1016770160
  }'

echo -e "\n\nTest completed."

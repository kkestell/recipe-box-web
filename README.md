docker build -t recipe-box .

docker run --rm --name recipe-box \
-p 3000:3000 \
-e DB_PATH=/usr/src/app/data/recipe-box.sqlite \
-v "$(pwd)/data:/usr/src/app/data" \
recipe-box
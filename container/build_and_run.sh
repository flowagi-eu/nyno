docker build -t nyno:latest -f docker/Dockerfile .
docker run -it -p 6001:6001 nyno:latest


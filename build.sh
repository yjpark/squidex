# Build the image
docker build . -t squidex-build-image -f Dockerfile.build

# Open the image
docker create --name squidex-build-container squidex-build-image

# Copy the output to the host file system
DATE=$(date -u +%Y%m%d)_$(date -u +%H%M%S)
docker cp squidex-build-container:/out ./publish_${DATE}

# Cleanup
docker rm squidex-build-container

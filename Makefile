IMAGE_NAME ?= telegram-companion-bot
CONTAINER_NAME ?= telegram-companion-bot
ENV_FILE ?= .env
CHARACTER_FILE ?= $(PWD)/character/profile.md
LOG_TAIL ?= 20

.DEFAULT_GOAL := start

.PHONY: start build run logs stop clean

start: run logs

build:
	docker build -t $(IMAGE_NAME) .

run: build
	@test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE). Copy .env.example and fill tokens." && exit 1)
	docker rm -f $(CONTAINER_NAME) 2>/dev/null || true
	docker run -d --name $(CONTAINER_NAME) --env-file $(ENV_FILE) \
		-v $(PWD)/data:/app/data \
		-v $(CHARACTER_FILE):/app/character/profile.md \
		$(IMAGE_NAME)

logs:
	docker logs -f --tail=$(LOG_TAIL) $(CONTAINER_NAME)

stop:
	docker stop $(CONTAINER_NAME) 2>/dev/null || true

clean: stop
	docker rm -f $(CONTAINER_NAME) 2>/dev/null || true
	docker rmi $(IMAGE_NAME) 2>/dev/null || true

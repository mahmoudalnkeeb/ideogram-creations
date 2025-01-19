# Notes

## create those files in root directory

> required for the server to work. you can get them from the ideogram.ai website from any request that requires authentication.

- authorization.txt
- cookie.txt

you can get `authoriztion.txt` from authorization header and `cookie.txt` from cookie header.

## How to use

1. run `npm install` to install dependencies
2. install redis and run redis server  using `redis-server`
3. after configuring .env file run `npm run start` to start the server
4. the api will be available at `http://localhost:3000`

## endpoint `POST /create-image`

### request body

```json
{
  "prompt": "A scene of a room with a giant PC. The PC has a glass casing and is filled with liquid. There are control panels around the PC. The room has an industrial feel, with pipes and vents on the walls."
}
```

### response

```json
[
  "https://ideogram.ai/assets/image/lossless/response/{response_id}",
  "https://ideogram.ai/assets/image/lossless/response/{response_id}",
  "https://ideogram.ai/assets/image/lossless/response/{response_id}",
  "https://ideogram.ai/assets/image/lossless/response/{response_id}"
]
```

## environment variables

```bash
PORT=3000
EXTERNAL_PHOTO_URL="This can be found in the ideogram.ai in /login request payload"
LOCATION = "This can be found in the ideogram.ai in /submit request payload"
SSL_ENABLED=false
SSL_KEY_PATH="SSL KEY PATH GOES HERE"
SSL_CERT_PATH="SSL CERT PATH GOES HERE"
USE_QUEUE=true
REDIS_URL="redis://localhost:6379"
WAIT_TIME_SECONDS=30 # 30 for free tier and 3 for pro tier
```

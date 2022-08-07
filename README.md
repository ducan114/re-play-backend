# re-play-backend
## Requirements
*Make sure you have Node.js and NPM installed.*
## Installation
### 1. Install dependencies
Open your terminal, `cd` into the project's home directory. Run `npm install`.
### 2. Set up environment variables
Under the project's home directory, create a file named `.env` with the following content:
```
; Google Oauth2.0 credentials
AUTH_CLIENT_ID=<your client id>
AUTH_CLIENT_SECRET=<your client secret>
AUTH_REDIRECT_URI=<your redirect uri>
; Google API credentials
CREDENTIALS_CLIENT_ID=<your client id>
CREDENTIALS_CLIENT_SECRET=<your client secret>
CREDENTIALS_REDIRECT_URI=<your redirect uri>

FRONTEND_URL=<your frontend url>
JWT_ACCESS_TOKEN_SECRET=<random string>
JWT_REFRESH_TOKEN_SECRET=<random string>
MONGODB_STRING_URI=<mongodb string uri>

; Google API token
TOKEN_ACCESS_TOKEN=<access token>
TOKEN_EXPIRY_DATE=<expiry date>
TOKEN_REFRESH_TOKEN=<refresh token>
TOKEN_SCOPE=https://www.googleapis.com/auth/drive
TOKEN_TOKEN_TYPE=Bearer

PORT=<port>
DRIVE_APP_ROOT_FOLDER=<Google Drive folder ID>
```
## Run
Open your terminal, run `npm run dev`

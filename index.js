if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const { startServer } = require('./server');
const { OAuth2Client } = require('google-auth-library');

const {
  CREDENTIALS_CLIENT_ID,
  CREDENTIALS_CLIENT_SECRET,
  CREDENTIALS_REDIRECT_URI,
  TOKEN_ACCESS_TOKEN,
  TOKEN_REFRESH_TOKEN,
  TOKEN_SCOPE,
  TOKEN_TOKEN_TYPE,
  TOKEN_EXPIRY_DATE
} = process.env;

const token =
  TOKEN_ACCESS_TOKEN &&
  TOKEN_REFRESH_TOKEN &&
  TOKEN_SCOPE &&
  TOKEN_TOKEN_TYPE &&
  TOKEN_EXPIRY_DATE
    ? {
        access_token: TOKEN_ACCESS_TOKEN,
        refresh_token: TOKEN_REFRESH_TOKEN,
        scope: TOKEN_SCOPE,
        token_type: TOKEN_TOKEN_TYPE,
        expiry_date: TOKEN_EXPIRY_DATE
      }
    : null;

authorize(startServer);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
  const oAuth2Client = new OAuth2Client(
    CREDENTIALS_CLIENT_ID,
    CREDENTIALS_CLIENT_SECRET,
    CREDENTIALS_REDIRECT_URI
  );

  if (!token) return;

  oAuth2Client.setCredentials(token);
  callback(oAuth2Client);
}

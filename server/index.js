const express = require('express');
const queryString = require('querystring');
const axios = require('axios');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 * https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
 */
const generateRandomString = (length) => {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const stateKey = 'spotify_auth_state';

// Request authorization from Spotify
app.get('/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    const scope = 'user-read-private user-read-email';

    const queryParams = queryString.stringify({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: state,
        scope: scope,
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

// Use auth code to request access token
app.get('/callback', (req, res) => {
    const code = req.query.code || null;

    axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: queryString.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        }),
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${new Buffer.from(
                `${CLIENT_ID}:${CLIENT_SECRET}`
            ).toString('base64')}`,
        },
    })
        .then((response) => {
            if (response.status === 200) {
                const { access_token, token_type } = response.data;

                // Use access token to request data from Spotify API
                axios
                    .get('https://api.spotify.com/v1/me', {
                        headers: {
                            Authorization: `${token_type} ${access_token}`,
                        },
                    })
                    .then((response) => {
                        res.send(
                            `<pre>${JSON.stringify(
                                response.data,
                                null,
                                2
                            )}</pre>`
                        );
                    })
                    .catch((error) => {
                        res.send(error);
                    });
            } else {
                res.send(response);
            }
        })
        .catch((error) => {
            res.send(error);
        });
});

app.get('/refresh-token', (req, res) => {
    const { refresh_token } = req.query;

    axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: queryString.stringify({
            grant_type: 'refresh_token',
            code: code,
            refresh_token: refresh_token,
        }),
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${new Buffer.from(
                `${CLIENT_ID}:${CLIENT_SECRET}`
            ).toString('base64')}`,
        },
    })
        .then((response) => {
            if (response.status === 200) {
                const { access_token, token_type } = response.data;

                axios
                    .get('https://api.spotify.com/v1/me', {
                        headers: {
                            Authorization: `${token_type} ${access_token}`,
                        },
                    })
                    .then((response) => {
                        res.send(
                            `<pre>${JSON.stringify(
                                response.data,
                                null,
                                2
                            )}</pre>`
                        );
                    })
                    .catch((error) => {
                        res.send(error);
                    });
            } else {
                res.send(response);
            }
        })
        .catch((error) => {
            res.send(error);
        });
});

app.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`);
});

# arbeitsverwaltung_api
A simple API made with express in NodeJS just because I'm learning how to build APIs properly and don't want to suffer the endless void of API frameworks out there that are so oriented towards site hosting instead of just APIs.

Enjoy this mess from a beginner.

***

## Introduction

Before starting the server, make sure an empty db folder is present and run `npm install`. Then run `npm run start` to launch the server.

This API always sends out responses in JSON format and also expects POST requests with JSON in the request bodies (unless specified). Bad requests should also return a JSON object with the error message. By default, unrouted paths would always return a 404.

In the usage section below, routes are denoted firstly by the HTTP verb (like GET, POST, PUT), then followed by the path. POST requests have the 'expects' part, which only contain the required properties of the JSON object to be sent in with the POST request. Any other property would be ignored. For example, if a POST route expects *"email: string, password: string"*, then the JSON object attached with the request should be : 

```
{
    "email": "test@example.com",
    "password": "password"
}
```

Some routes require authorization via the 'Authorization' header. This can be denoted with *(auth)* at the end of the route name listed below. These routes require an access token in the 'Authorization' header of the request to be processed.

Responses would change later on in the future to be more standardized.

A failed/error response should always be in this format :

```
{
    "success": false,
    "message": [error message]
}
```

## Usage (API routes start with /api)

- ### GET / 
**Returns** -
```
{
    "message": "Ok"
}
```

- ### POST /register
**Expects** - email: string, password: string, passwordConfirmation: string

**Returns**
```
{
    "success": true,
    "message": [the user object with id],
    "accessToken": [a long string],
    "refreshToken": [a long string]
}
```

- ### POST /login
**Expects** - email: string, password: string

**Returns** - similar to register

- ### GET /logout (auth)
**Returns**
```
{
    "success": true,
    "message": "Logged out successfully!"
}
```

- ### GET /auth-test (auth)
**Returns**
```
{
    "success": true,
    "message": "You are authenticated!"
}
```

- ### POST /refresh-token
**Expects** - refreshToken: string

**Returns** 
```
{
    "success": true,
    "message": "",
    "accessToken": [a long string, different to the current access token],
    "refreshToken": [a long string, also different]
}
```

**This documentation is not final and there will be changes in the future!**
**Table of Contents:**

- [Overview](#overview)
- [Global Errors](#global-errors)
  - [`ErrorDataWrite`](#errordatawrite)
  - [`ErrorDataRead`](#errordataread)
  - [`ErrorInternal`](#errorinternal)
- [`/api/users`](#apiusers)
  - [`GET /api/users/{id}`](#get-apiusersid)
  - [`GET /api/users/{id}/clusters`](#get-apiusersidclusters)
  - [`GET /api/users/{id}/clusters/all`](#get-apiusersidclustersall)
  - [`POST /api/users`](#post-apiusers)
  - [`POST /api/login`](#post-apilogin)
  - [`POST /api/logout`](#post-apilogout)
  - [`PUT /api/users/{id}`](#put-apiusersid)
  - [`DELETE /api/users/{id}`](#delete-apiusersid)

### Overview

This is the API specification that the Go server is implementing. 

**Error handling:**

Errors are passed via both a non-`2xx` status code and an HTTPError response body:

```js
HTTPError{
    // The Porter custom error code
    Code: Number,
    // A descriptive error message
    Errors: []String,
}
```

Internal server errors are shared across all endpoints and are listed in the [Global Errors](#global-errors) section. 

**Authentication:** The current authentication method is cookie-based sessions--most endpoints require a cookie-based session. 

### Global Errors

#### `ErrorDataWrite`

**Description:** occurs when a write is attempted against the database and fails. 

**Status Code:** `500`

**Response Body:**

```json
{
	"Code": 500,
	"Errors": [{
		"could not write to database"
	}],
}
```

#### `ErrorDataRead`

**Description:** occurs when a read is attempted against the database and fails. 

**Status Code:** `500`

**Response Body:**

```json
{
	"Code": 500,
	"Errors": [{
		"could not read from database"
	}],
}
```

#### `ErrorInternal`

**Description:** occurs with a generic internal server error

**Status Code:** `500`

**Response Body:**

```json
{
	"Code": 500,
	"Errors": [{
		"internal server error"
	}],
}
```

### `/api/users`

#### `GET /api/users/{id}`

**Description:** Gets a user object matching a specific `id`. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
User{
    "id": Number,
    "email": String,
    "clusters": []String,
    "rawKubeConfig": String,
}
```

**Successful Status Code**: `200`

**Errors:**

- User not found
  - Status Code: `404`
  - Request Body:
    ```json
    {
        "code":602,
        "errors":["could not find requested object"]
    }
    ```
- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```

#### `GET /api/users/{id}/clusters`

**Description:** Retrieves the clusters that are currently linked to a User account. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
[]ClusterConfig{
  "name": String,
  "server": String,
  "context": String,
  "user": String,
}
```

**Successful Status Code**: `200`

**Errors:** 
- User not found
  - Status Code: `404`
  - Request Body:
    ```json
    {
        "code":602,
        "errors":["could not find requested object"]
    }
    ```
- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```

#### `GET /api/users/{id}/clusters/all`

**Description:** Parses all clusters from the user's kubeconfig and returns a list of viable cluster configs. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
[]ClusterConfig{
  "name": String,
  "server": String,
  "context": String,
  "user": String,
}
```

**Successful Status Code**: `200`

**Errors:** 
- User not found
  - Status Code: `404`
  - Request Body:
    ```json
    {
        "code":602,
        "errors":["could not find requested object"]
    }
    ```
- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```

#### `POST /api/users`

**Description:** Creates a new user with a given email and password.

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: 

```js
{
    "email": String,
    "password": String,
}
```

**Successful Response Body**: N/A

**Successful Status Code**: `201`

**Errors:**

- Invalid email (example: `{"email": "notanemail"}`)
  - Status Code: `422`
  - Request Body:
    ```json
    {
        "code":601,
        "errors":["email validation failed"]
    }
    ```

- Missing field
  - Status Code: `422`
  - Request Body:
    ```json
    {
        "code":601,
        "errors":["required validation failed"]
    }`
    ```

- Email already taken 
  - Status Code: `422`
  - Request Body:
    ```json
    {
        "code":601,
        "errors":["email already taken"]
    }
    ```

#### `POST /api/login`

**Description:** Logs a user in via email and password.

**URL parameters:** N/A

**Query parameters:** N/A

**Request Body**: 

```js
{
    "email": String,
    "password": String,
}
```

**Successful Response Body**: N/A

**Successful Status Code**: `200`

**Errors:**

- Email not registered
  - Status Code: `401`
  - Request Body:
    ```json
    {
        "code": 401,
        "errors": ["email not registered"]
    }
    ```

- Incorrect password
  - Status Code: `401`
  - Request Body:
    ```json
    {
        "code":401,
        "errors":["incorrect password"]
    }
    ```

#### `POST /api/logout`

**Description:** Logs a user out by detaching a user from the cookie-based session. 

**URL parameters:** N/A

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: N/A

**Successful Status Code**: `200`

**Errors:**

- Not logged in
  - Status Code: `403`
  - Request Body:
    ```sh
    "Forbidden"
    ```

#### `PUT /api/users/{id}`

**Description:** Updates an existing user.

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request body:**

```js
{
  "rawKubeConfig": String,
  "allowedClusters": []String,
}
```

**Successful Response Body**: N/A

**Successful Status Code**: `204`

**Errors:** 

- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```

#### `DELETE /api/users/{id}`

**Description:** Deletes an existing user, requires the password to be sent before deletion. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request body:**

```js
{
    "password": String,
}
```

**Successful Response Body**: N/A

**Successful Status Code**: `204`

**Errors:** 

- Invalid `password`
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":601,
        "errors":["invalid password"]
    }
    ```
    
- Missing field
  - Status Code: `422`
  - Request Body:
    ```json
    {
        "code":601,
        "errors":["required validation failed"]
    }`
    ```

- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```


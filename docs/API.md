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
  - [`GET /api/users/{id}/clusters`](#get-apiusersidclusters)
  - [`POST /api/users`](#post-apiusers)
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
		"Could not write to database"
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
		"Could not read from database"
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
		"Internal server error"
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
    "clusters": []ClusterConfig{
        "name": String,
        "server": String,
        "context": String,
        "user": String,
    },
    "rawKubeConfig": String,
}
```

**Successful Status Code**: `200`

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

#### `GET /api/users/{id}/clusters`

**Description:** Retrieves the clusters that are currently linked to a User account. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
{
    "clusters": []ClusterConfig{
        "name": String,
        "server": String,
        "context": String,
        "user": String,
    },
}
```

**Successful Status Code**: `200`

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

#### `GET /api/users/{id}/clusters/all`

**Description:** Parses all clusters from the user's kubeconfig and returns a list of viable cluster configs. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
{
    "clusters": []ClusterConfig{
        "name": String,
        "server": String,
        "context": String,
        "user": String,
    },
}
```

**Successful Status Code**: `200`

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

#### `PUT /api/users/{id}`

**Description:** Updates an existing user.

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request body:**

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

- Invalid `id` URL parameter
  - Status Code: `400`
  - Request Body:
    ```json
    {
        "code":600,
        "errors":["could not process request"]
    }
    ```


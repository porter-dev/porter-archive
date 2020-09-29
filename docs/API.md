Errors are passed via both a non-`2xx` status code and an HTTPError response body:

```js
HTTPError{
    // The Porter custom error code
    Code: Number,
    // A descriptive error message
    Errors: []String,
}
```

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

**Description:** Updates an existing user

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request body:**

**Successful Response Body**: N/A

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

**Description:** Deletes an existing user

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request body:**

**Successful Response Body**: N/A

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


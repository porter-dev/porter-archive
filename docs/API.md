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
        "errors":["Email already taken"]
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

**Errors:** TBD

#### `GET /api/users/{id}/clusters/all`

**Description:** Parses all clusters from the user's kubeconfig and returns a list of viable cluster configs. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Response Body**: 

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

**Errors:** TBD

#### `POST /api/users/{id}`

#### `POST /api/users/{id}/clusters`

#### `PUT /api/users/{id}`

#### `DELETE /api/users/{id}`


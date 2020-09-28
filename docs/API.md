### Global Errors

#### Database Write Error

**Description:** occurs when a write is attempted against the database and fails. 

**Status Code:** `500`

**Response Body:**

```js
{
	Code: 500,
	Errors: []String{
		"Could not write to database",
	},
}
```

#### Database Write Error

**Description:** occurs when a read is attempted against the database and fails. 

**Status Code:** `500`

**Response Body:**

```js
{
	Code: 500,
	Errors: []String{
		"Could not read from database",
	},
}
```

#### Internal Server Error

**Description:** occurs with a generic internal server error

**Status Code:** `500`

**Response Body:**

```js
{
	Code: 500,
	Errors: []String{
		"Internal server error",
	},
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

#### `GET /api/users/{id}/clusters`

#### `GET /api/users/{id}/clusters/all`

**Description:** Parses all cluster names from the user's kubeconfig and returns a list of viable cluster names. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Response Body**: 

```js
{
    "clusters": []String
}
```

#### `POST /api/users/{id}`

#### `POST /api/users/{id}/clusters`

#### `PUT /api/users/{id}`

#### `DELETE /api/users/{id}`


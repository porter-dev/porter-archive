## `/api/users`

### `GET /api/users/{id}`

**Description:** Gets a user object matching a specific `id`. 

**URL parameters:** 

- `id` -- the user's ID. 

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

### `GET /api/users/{id}/clusters`

### `GET /api/users/{id}/clusters/all`

**Description:** Parses all cluster names from the user's kubeconfig and returns a list of viable cluster names. 

**URL parameters:** 

- `id` -- the user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Response Body**: 

```js
{
    "clusters": []String
}
```

### `POST /api/users/{id}`

### `POST /api/users/{id}/clusters`

### `PUT /api/users/{id}`

### `DELETE /api/users/{id}`


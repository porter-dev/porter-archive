**Table of Contents:**

- [Overview](#overview)
- [Global Errors](#global-errors)
  - [`ErrorDataWrite`](#errordatawrite)
  - [`ErrorDataRead`](#errordataread)
  - [`ErrorInternal`](#errorinternal)
- [`/api/users`](#apiusers)
  - [`GET /api/users/{id}`](#get-apiusersid)
  - [`GET /api/users/{id}/contexts`](#get-apiusersidcontexts)
  - [`POST /api/users`](#post-apiusers)
  - [`POST /api/login`](#post-apilogin)
  - [`POST /api/logout`](#post-apilogout)
  - [`PUT /api/users/{id}`](#put-apiusersid)
  - [`DELETE /api/users/{id}`](#delete-apiusersid)
- [`/api/charts`](#apicharts)
  - [`GET /api/charts`](#get-apicharts)
  - [`GET /api/charts/{name}/{revision}`](#get-apichartsnamerevision)
- [`/api/k8s`](#apik8s)
  - [`GET /api/k8s/namespaces`](#get-apik8snamespaces)


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
    "contexts": []String,
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

#### `GET /api/users/{id}/contexts`

**Description:** Retrieves a list of contexts parsed from the provided kubeconfig. 

**URL parameters:** 

- `id` The user's ID. 

**Query parameters:** N/A

**Request Body**: N/A

**Successful Response Body**: 

```js
[]Context{
  "name": String,
  "server": String,
  "cluster": String,
  "user": String,
  "selected": Boolean,
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

**Successful Response Body**:
User object with only the id field. Other fields are empty - with values in parantheses.
```js
{
  "id": Int,
  "email": String ("")
  "contexts": []String (NULL)
  "rawKubeConfig": String ("")
}
```

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

**Successful Response Body**:
User object with only the id field. Other fields are empty - with values in parantheses.
```js
{
  "id": Int,
  "email": String ("")
  "contexts": []String (NULL)
  "rawKubeConfig": String ("")
}
```

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
  "allowedContexts": []String,
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

### `/api/charts`

#### `GET /api/charts`

**Description:** Gets a list of charts for a current context and a kubeconfig retrieved from the user's ID. 

**URL parameters:** N/A

**Query parameters:** N/A

**Request Body**:

```js
{
  "user_id": Number,
  "helm": {
    // The namespace of the cluster to be used
    "namespace": String,
    // The name of the context in the kubeconfig being used
    "context": String,
    // The Helm storage option to use
    "storage": String("secret"|"configmap"|"memory")
  },
  "filter": {
    "namespace": String,
    "limit": Number,
    "skip": Number,
    "byDate": Boolean,
    "statusFilter": []String
  }
}
```

**Successful Response Body**: the full body is determined by the [release specification](https://pkg.go.dev/helm.sh/helm/v3@v3.3.4/pkg/release#Release): listed here is a subset of fields deemed to be most relevant. Note that all of the top-level fields are optional.

```js
[]Chart{
  // Name is the name of the release
  "name": String,
  "info": Info{
    // LastDeployed is when the release was last deployed.
    "last_deployed": String,
    // Deleted tracks when this object was deleted.
    "deleted": String,
    // Description is human-friendly "log entry" about this release.
    "description": String,
    // Status is the current state of the release
    "status": String("unknown"|"deployed"|"uninstalled"|"superseded"|"failed"|"uninstalling"|"pending-install"|"pending-upgrade"|"pending-rollback")
  },
  "chart": Chart{
    "metadata": Metadata{
      // The name of the chart
      "name": String,
      // The URL to a relevant project page, git repo, or contact person
      "home": String,
      // Sources is a list of URLs to the source code of this chart
      "sources": []String,
      // A SemVer 2 conformant version string of the chart
      "version": String,
      // A one-sentence description of the chart
      "description": String,
      // The URL to an icon file.
      "icon": String,
      // The API Version of this chart.
      "apiVersion": String,
    },
    "templates": []File{
      // Name is the path-like name of the template.
      "name": String,
      // Data is the template as byte data.
      "data": String
    },
    // Values are default config for this chart.
    "values": Map[String]{}
  },
  // The set of extra Values added to the chart, which override the 
  // default values inside of the chart
  "config": Map[String]{},
  // Manifest is the string representation of the rendered template
  "manifest": String,
  // Version is an int which represents the revision of the release.
  "version": Number,
  // Namespace is the kubernetes namespace of the release.
  "namespace": String
}
```

**Successful Status Code**: `200`

**Errors:** TBD

#### `GET /api/charts/{name}/{revision}`

**Description:** Gets a single chart for a current context and a kubeconfig retrieved from the user's ID based on a **name** and **revision**. To retrieve the latest deployed chart, set **revision** to 0. 

**URL parameters:** 

- `name` The name of the release.
- `revision` The number of the release (set to `0` for the latest deployed release).

**Query parameters:** N/A

**Request Body**:

```js
{
  "user_id": Number,
  "helm": {
    // The namespace of the cluster to be used
    "namespace": String,
    // The name of the context in the kubeconfig being used
    "context": String,
    // The Helm storage option to use
    "storage": String("secret"|"configmap"|"memory")
  }
}
```

**Successful Response Body**: the full body is determined by the [release specification](https://pkg.go.dev/helm.sh/helm/v3@v3.3.4/pkg/release#Release): listed here is a subset of fields deemed to be most relevant. Note that all of the top-level fields are optional.

```js
Chart{
  // Name is the name of the release
  "name": String,
  "info": Info{
    // LastDeployed is when the release was last deployed.
    "last_deployed": String,
    // Deleted tracks when this object was deleted.
    "deleted": String,
    // Description is human-friendly "log entry" about this release.
    "description": String,
    // Status is the current state of the release
    "status": String("unknown"|"deployed"|"uninstalled"|"superseded"|"failed"|"uninstalling"|"pending-install"|"pending-upgrade"|"pending-rollback")
  },
  "chart": Chart{
    "metadata": Metadata{
      // The name of the chart
      "name": String,
      // The URL to a relevant project page, git repo, or contact person
      "home": String,
      // Sources is a list of URLs to the source code of this chart
      "sources": []String,
      // A SemVer 2 conformant version string of the chart
      "version": String,
      // A one-sentence description of the chart
      "description": String,
      // The URL to an icon file.
      "icon": String,
      // The API Version of this chart.
      "apiVersion": String,
    },
    "templates": []File{
      // Name is the path-like name of the template.
      "name": String,
      // Data is the template as byte data.
      "data": String
    },
    // Values are default config for this chart.
    "values": Map[String]{}
  },
  // The set of extra Values added to the chart, which override the 
  // default values inside of the chart
  "config": Map[String]{},
  // Manifest is the string representation of the rendered template
  "manifest": String,
  // Version is an int which represents the revision of the release.
  "version": Number,
  // Namespace is the kubernetes namespace of the release.
  "namespace": String
}
```

**Successful Status Code**: `200`

**Errors:** TBD

### `/api/k8s`

#### `GET /api/k8s/namespaces`

**Description:** 

**URL parameters:** N/A

**Query parameters:** N/A

**Request Body**: 

```js
{
  "user_id": Number,
  "k8s": {
    // The name of the context in the kubeconfig being used
    "context": String,
  }
}
```

**Successful Response Body**: the full body is determined by the [namespace specification](https://pkg.go.dev/k8s.io/api/core/v1#NamespaceList), but we're primarily only interested in namespace `name`:

```js
{
  "metadata": {},
  "items": []Namespace{
    "metadata": {
      "name": String
    }
  }
}
```

**Successful Status Code**: `200`

**Errors:** TBD
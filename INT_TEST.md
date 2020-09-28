Just storing the command-line "integration tests" I've done, which we can use later:

```sh
# should fail on form decoding
curl -X POST localhost:8080/api/users 

# should fail on email validation
curl -d "{\"email\":\"hello\",\"password\":\"hello\"}" -H 'Content-Type: application/json' -X POST localhost:8080/api/users

# should pass (without authentication)
curl -d "{\"email\":\"belanger@getporter.dev\",\"password\":\"hello\"}" -H 'Content-Type: application/json' -X POST localhost:8080/api/users

# should pass
curl -X DELETE localhost:8080/api/users/1 -d "{\"password\":\"hello\"}"
```
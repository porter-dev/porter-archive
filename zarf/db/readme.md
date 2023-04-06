export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="user=porter password=porter dbname=porter sslmode=disable host=localhost"

pg_dump -U postgres -h localhost -d porter \
--schema public --schema-only \
--if
--no-comments --on-conflict-do-nothing --column-inserts \

> schema.sql

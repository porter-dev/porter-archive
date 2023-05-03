-- name: PorterAppRevisionsForProject :many
SELECT * FROM porter_app_revisions
WHERE project_id = $1 AND deleted_at IS NULL;

-- name: CreatePorterAppRevision :one
INSERT INTO porter_app_revisions 
(project_id, base64_contract) 
VALUES 
($1, $2) RETURNING *;
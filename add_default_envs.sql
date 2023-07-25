with ecc as (
	insert into environment_configs (
		"created_at",
		"updated_at",
		"project_id",
		"cluster_id",
		"name",
		"auto",
		"is_default"
	) select now(), now(), p.id as project_id, c.id as cluster_id, c."name", false, true from projects p join clusters c on c.project_id = p.id where p.simplified_view_enabled = true
	returning id, cluster_id
) update porter_apps pa set environment_config_id = ecc.id
from ecc 
where pa.cluster_id = ecc.cluster_id
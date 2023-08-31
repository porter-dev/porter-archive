Setup kind cluster with 2 projects, both pointing to the same cluster. 1 project with simplified view and validate featureflag enabled, 1 with non-simplified view
Pull helm values from existing helm chart

`helm get values nginxa > non-umbrella.yaml`

`porter apply -f porter.yaml`

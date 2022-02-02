package infra

const testForm = `name: Test
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: String to echo
    - type: string-input
      variable: echo
      settings:
        default: hello
`

const ecrForm = `name: ECR
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: ECR Configuration
    - type: select
      label: 📍 AWS Region
      variable: aws_region
      settings:
        default: us-east-2
        options:
        - label: US East (N. Virginia) us-east-1
          value: us-east-1
        - label: US East (Ohio) us-east-2
          value: us-east-2
        - label: US West (N. California) us-west-1
          value: us-west-1
        - label: US West (Oregon) us-west-2
          value: us-west-2
        - label: Africa (Cape Town) af-south-1
          value: af-south-1
        - label: Asia Pacific (Hong Kong) ap-east-1
          value: ap-east-1
        - label: Asia Pacific (Mumbai) ap-south-1
          value: ap-south-1
        - label: Asia Pacific (Seoul) ap-northeast-2
          value: ap-northeast-2
        - label: Asia Pacific (Singapore) ap-southeast-1
          value: ap-southeast-1
        - label: Asia Pacific (Sydney) ap-southeast-2
          value: ap-southeast-2
        - label: Asia Pacific (Tokyo) ap-northeast-1
          value: ap-northeast-1
        - label: Canada (Central) ca-central-1
          value: ca-central-1
        - label: Europe (Ireland) eu-west-1
          value: eu-west-1
        - label: Europe (London) eu-west-2
          value: eu-west-2
        - label: Europe (Milan) eu-south-1
          value: eu-south-1
        - label: Europe (Paris) eu-west-3
          value: eu-west-3
        - label: Europe (Stockholm) eu-north-1
          value: eu-north-1
        - label: Middle East (Bahrain) me-south-1
          value: me-south-1
        - label: South America (São Paulo) sa-east-1
          value: sa-east-1
    - type: string-input
      label: ECR Name
      required: true
      placeholder: my-awesome-registry
      variable: ecr_name
`

const eksForm = `name: EKS
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: EKS Configuration
    - type: select
      label: 📍 AWS Region
      variable: aws_region
      settings:
        default: us-east-2
        options:
        - label: US East (N. Virginia) us-east-1
          value: us-east-1
        - label: US East (Ohio) us-east-2
          value: us-east-2
        - label: US West (N. California) us-west-1
          value: us-west-1
        - label: US West (Oregon) us-west-2
          value: us-west-2
        - label: Africa (Cape Town) af-south-1
          value: af-south-1
        - label: Asia Pacific (Hong Kong) ap-east-1
          value: ap-east-1
        - label: Asia Pacific (Mumbai) ap-south-1
          value: ap-south-1
        - label: Asia Pacific (Seoul) ap-northeast-2
          value: ap-northeast-2
        - label: Asia Pacific (Singapore) ap-southeast-1
          value: ap-southeast-1
        - label: Asia Pacific (Sydney) ap-southeast-2
          value: ap-southeast-2
        - label: Asia Pacific (Tokyo) ap-northeast-1
          value: ap-northeast-1
        - label: Canada (Central) ca-central-1
          value: ca-central-1
        - label: Europe (Ireland) eu-west-1
          value: eu-west-1
        - label: Europe (London) eu-west-2
          value: eu-west-2
        - label: Europe (Milan) eu-south-1
          value: eu-south-1
        - label: Europe (Paris) eu-west-3
          value: eu-west-3
        - label: Europe (Stockholm) eu-north-1
          value: eu-north-1
        - label: Middle East (Bahrain) me-south-1
          value: me-south-1
        - label: South America (São Paulo) sa-east-1
          value: sa-east-1
    - type: select
      label: ⚙️ AWS Machine Type
      variable: machine_type
      settings:
        default: t2.medium
        options:
        - label: t2.medium
          value: t2.medium
    - type: string-input
      label: 👤 Issuer Email
      required: true
      placeholder: example@example.com
      variable: issuer_email
    - type: string-input
      label: EKS Cluster Name
      required: true
      placeholder: my-cluster
      variable: cluster_name
`

const gcrForm = `name: GCR
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: GCR Configuration
    - type: select
      label: 📍 GCP Region
      variable: gcp_region
      settings:
        default: us-central1
        options:
        - label: asia-east1
          value: asia-east1
        - label: asia-east2
          value: asia-east2
        - label: asia-northeast1
          value: asia-northeast1
        - label: asia-northeast2
          value: asia-northeast2
        - label: asia-northeast3
          value: asia-northeast3
        - label: asia-south1
          value: asia-south1
        - label: asia-southeast1
          value: asia-southeast1
        - label: asia-southeast2
          value: asia-southeast2
        - label: australia-southeast1
          value: australia-southeast1
        - label: europe-north1
          value: europe-north1
        - label: europe-west1
          value: europe-west1
        - label: europe-west2
          value: europe-west2
        - label: europe-west3
          value: europe-west3
        - label: europe-west4
          value: europe-west4
        - label: europe-west6
          value: europe-west6
        - label: northamerica-northeast1
          value: northamerica-northeast1
        - label: southamerica-east1
          value: southamerica-east1
        - label: us-central1
          value: us-central1
        - label: us-east1
          value: us-east1
        - label: us-east4
          value: us-east4
        - label: us-east1
          value: us-east1
        - label: us-east1
          value: us-east1
        - label: us-west1
          value: us-west1
        - label: us-east1
          value: us-west2
        - label: us-west3
          value: us-west3
        - label: us-west4
          value: us-west4
`

const gkeForm = `name: GKE
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: GKE Configuration
    - type: select
      label: 📍 GCP Region
      variable: gcp_region
      settings:
        default: us-central1
        options:
        - label: asia-east1
          value: asia-east1
        - label: asia-east2
          value: asia-east2
        - label: asia-northeast1
          value: asia-northeast1
        - label: asia-northeast2
          value: asia-northeast2
        - label: asia-northeast3
          value: asia-northeast3
        - label: asia-south1
          value: asia-south1
        - label: asia-southeast1
          value: asia-southeast1
        - label: asia-southeast2
          value: asia-southeast2
        - label: australia-southeast1
          value: australia-southeast1
        - label: europe-north1
          value: europe-north1
        - label: europe-west1
          value: europe-west1
        - label: europe-west2
          value: europe-west2
        - label: europe-west3
          value: europe-west3
        - label: europe-west4
          value: europe-west4
        - label: europe-west6
          value: europe-west6
        - label: northamerica-northeast1
          value: northamerica-northeast1
        - label: southamerica-east1
          value: southamerica-east1
        - label: us-central1
          value: us-central1
        - label: us-east1
          value: us-east1
        - label: us-east4
          value: us-east4
        - label: us-east1
          value: us-east1
        - label: us-east1
          value: us-east1
        - label: us-west1
          value: us-west1
        - label: us-east1
          value: us-west2
        - label: us-west3
          value: us-west3
        - label: us-west4
          value: us-west4
    - type: string-input
      label: 👤 Issuer Email
      required: true
      placeholder: example@example.com
      variable: issuer_email
    - type: string-input
      label: GKE Cluster Name
      required: true
      placeholder: my-cluster
      variable: cluster_name
`

const docrForm = `name: DOCR
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: DOCR Configuration
    - type: select
      label: DO Subscription Tier
      variable: docr_subscription_tier
      settings:
        default: basic
        options:
        - label: Basic
          value: basic
        - label: Professional
          value: professional
    - type: string-input
      label: DOCR Name
      required: true
      placeholder: my-awesome-registry
      variable: docr_name
`

const doksForm = `name: DOKS
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: DOKS Configuration
    - type: select
      label: 📍 DO Region
      variable: do_region
      settings:
        default: nyc1
        options:
        - label: Amsterdam 3
          value: ams3
        - label: Bangalore 1
          value: blr1
        - label: Frankfurt 1
          value: fra1
        - label: London 1
          value: lon1
        - label: New York 1
          value: nyc1
        - label: New York 3
          value: nyc3
        - label: San Francisco 2
          value: sfo2
        - label: San Francisco 3
          value: sfo3
        - label: Singapore 1
          value: sgp1
        - label: Toronto 1
          value: tor1
    - type: string-input
      label: 👤 Issuer Email
      required: true
      placeholder: example@example.com
      variable: issuer_email
    - type: string-input
      label: DOKS Cluster Name
      required: true
      placeholder: my-cluster
      variable: cluster_name
`

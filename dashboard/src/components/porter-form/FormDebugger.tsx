import React, { Component } from "react";
import styled from "styled-components";
import AceEditor from "react-ace";
import PorterFormWrapper from "./PorterFormWrapper";
import CheckboxRow from "components/form-components/CheckboxRow";
import InputRow from "components/form-components/InputRow";
import yaml from "js-yaml";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-text";

import Heading from "../form-components/Heading";
import Helper from "../form-components/Helper";
import { ChartType } from "shared/types";

type PropsType = {
  goBack: () => void;
};

type StateType = {
  rawYaml: string;
  showBonusTabs: boolean;
  showStateDebugger: boolean;
  valuesToOverride: any;
  checkbox_a: boolean;
  input_a: string;
  isReadOnly: boolean;
};

const tabOptions = [
  { value: "a", label: "Bonus Tab A" },
  { value: "b", label: "Bonus Tab B" },
];

export default class FormDebugger extends Component<PropsType, StateType> {
  state = {
    rawYaml: initYaml,
    showBonusTabs: false,
    showStateDebugger: true,
    valuesToOverride: {
      checkbox_a: {
        value: true,
      },
    } as any,
    checkbox_a: true,
    input_a: "",
    isReadOnly: false,
  };

  renderTabContents = (currentTab: string) => {
    return (
      <TabWrapper>
        {this.state.rawYaml.toString().slice(0, 300) || "No raw YAML inputted."}
      </TabWrapper>
    );
  };

  aceEditorRef = React.createRef<AceEditor>();
  render() {
    let formData = {};
    try {
      formData = yaml.load(this.state.rawYaml);
    } catch (err: any) {
      console.log("YAML parsing error.");
    }
    return (
      <StyledFormDebugger>
        <Button onClick={this.props.goBack}>
          <i className="material-icons">keyboard_backspace</i>
          Back
        </Button>
        <Heading isAtTop={true}>✨ Form.yaml Editor</Heading>
        <Helper>Write and test form.yaml free of consequence.</Helper>

        <EditorWrapper>
          <AceEditor
            ref={this.aceEditorRef}
            mode="yaml"
            value={this.state.rawYaml}
            theme="porter"
            onChange={(e: string) => this.setState({ rawYaml: e })}
            name="codeEditor"
            editorProps={{ $blockScrolling: true }}
            height="450px"
            width="100%"
            style={{
              borderRadius: "5px",
              border: "1px solid #ffffff22",
              marginTop: "27px",
              marginBottom: "27px",
            }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
          />
        </EditorWrapper>

        <CheckboxRow
          label="Show form state debugger"
          checked={this.state.showStateDebugger}
          toggle={() =>
            this.setState({ showStateDebugger: !this.state.showStateDebugger })
          }
        />
        <CheckboxRow
          label="Read-only"
          checked={this.state.isReadOnly}
          toggle={() =>
            this.setState({
              isReadOnly: !this.state.isReadOnly,
            })
          }
        />
        <CheckboxRow
          label="Include non-form dummy tabs"
          checked={this.state.showBonusTabs}
          toggle={() =>
            this.setState({ showBonusTabs: !this.state.showBonusTabs })
          }
        />
        <CheckboxRow
          label="checkbox_a"
          checked={this.state.checkbox_a}
          toggle={() =>
            this.setState({
              checkbox_a: !this.state.checkbox_a,

              // Override the form value for checkbox_a
              valuesToOverride: {
                ...this.state.valuesToOverride,
                checkbox_a: {
                  value: !this.state.checkbox_a,
                },
              },
            })
          }
        />
        <InputRow
          type="string"
          value={this.state.input_a}
          setValue={(x: string) =>
            this.setState({
              input_a: x,

              // Override the form value for input_a
              valuesToOverride: {
                ...this.state.valuesToOverride,
                input_a: {
                  value: x,
                },
              },
            })
          }
          label={"input_a"}
          placeholder="ex: override text"
        />

        <Heading>🎨 Rendered Form</Heading>
        <Br />
        <PorterFormWrapper
          showStateDebugger={this.state.showStateDebugger}
          formData={formData}
          valuesToOverride={{
            input_a: this.state.valuesToOverride?.input_a?.value,
          }}
          isReadOnly={this.state.isReadOnly}
          onSubmit={(vars) => {
            alert("check console output");
            console.log(vars);
          }}
          rightTabOptions={this.state.showBonusTabs ? tabOptions : []}
          renderTabContents={this.renderTabContents}
          saveButtonText={"Test Submit"}
          injectedProps={{
            "url-link": {
              chart: {
                name: "something",
              } as ChartType,
            },
          }}
        />
      </StyledFormDebugger>
    );
  }
}

const Br = styled.div`
  width: 100%;
  height: 12px;
`;

const TabWrapper = styled.div`
  background: #ffffff11;
  height: 200px;
  width: 100%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  overflow: auto;
  padding: 50px;
`;

const EditorWrapper = styled.div`
  .ace_editor,
  .ace_editor * {
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Droid Sans Mono", "Consolas",
      monospace !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
  }
`;

const StyledFormDebugger = styled.div`
  position: relative;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  margin-left: -2px;
  padding: 0px 8px;
  width: 85px;
  float: right;
  padding-bottom: 1px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: 2px solid #969fbbaa;
  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    color: #969fbbaa;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const initYaml = `name: Web
hasSource: true
includeHiddenFields: true
tabs:
- name: main
  label: Main
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: Container Settings
    - type: variable
      variable: showStartCommand
      settings:
        default: true
  - name: command
    show_if: showStartCommand
    contents:
    - type: subtitle
      name: command_description
      label: (Optional) Set a start command for this service.
    - type: string-input
      label: Start Command
      placeholder: "ex: sh ./script.sh"
      variable: container.command
  - name: section_one_cont
    contents:
    - type: subtitle
      label: Specify the port your application is running on.
    - type: number-input
      variable: container.port
      label: Container Port
      placeholder: "ex: 80"
      settings:
        default: 80
    - type: heading
      label: Deploy Webhook
    - type: checkbox
      variable: auto_deploy
      label: Auto-deploy when webhook is called.
      settings:
        default: true
  - name: network
    contents:
    - type: heading
      label: Network Settings
    - type: subtitle
      label: For containers that you do not want to expose to external traffic (e.g. databases and add-ons), you may make them accessible only to other internal services running within the same cluster. 
    - type: checkbox
      variable: ingress.enabled
      label: Expose to external traffic
      settings:
        default: true
  - name: domain_toggle
    show_if: ingress.enabled
    contents:
    - type: subtitle
      label: Assign custom domain to your deployment. You must first create an A record in your domain provider that points to your cluster load balancer's IP address for this.
    - type: checkbox
      variable: ingress.custom_domain
      label: Configure Custom Domain
      settings:
        default: false 
  - name: domain_name
    show_if: ingress.custom_domain
    contents:
    - type: array-input
      variable: ingress.hosts
      label: Domain Name
  - name: do_wildcard
    show_if: 
      and:
      - ingress.custom_domain
      - currentCluster.service.is_do
    contents:
    - type: subtitle
      label: If you're hosting on Digital Ocean and have enabled the wildcard domains from the 'HTTPS Issuer', you can use a wildcard certificate.
    - type: checkbox
      variable: ingress.wildcard
      label: Use Wildcard Certificate
- name: resources
  label: Resources
  sections:
  - name: main_section
    contents:
    - type: heading
      label: Resources
    - type: subtitle
      label: Configure resources assigned to this container.
    - type: number-input
      label: RAM
      variable: resources.requests.memory
      placeholder: "ex: 256"
      settings:
        unit: Mi
        default: 256
    - type: number-input
      label: CPU
      variable: resources.requests.cpu
      placeholder: "ex: 100"
      settings:
        unit: m
        default: 100
    - type: number-input
      label: Replicas
      variable: replicaCount
      placeholder: "ex: 1"
      settings:
        default: 1
    - type: checkbox
      variable: autoscaling.enabled
      label: Enable autoscaling
      settings:
        default: false
  - name: autoscaler
    show_if: autoscaling.enabled
    contents:
    - type: number-input
      label: Minimum Replicas
      variable: autoscaling.minReplicas
      placeholder: "ex: 1"
      settings:
        default: 1
    - type: number-input
      label: Maximum Replicas
      variable: autoscaling.maxReplicas
      placeholder: "ex: 10"
      settings:
        default: 10
    - type: number-input
      label: Target CPU Utilization
      variable: autoscaling.targetCPUUtilizationPercentage
      placeholder: "ex: 50"
      settings:
        omitUnitFromValue: true
        unit: "%"
        default: 50
    - type: number-input
      label: Target RAM Utilization
      variable: autoscaling.targetMemoryUtilizationPercentage
      placeholder: "ex: 50"
      settings:
        omitUnitFromValue: true
        unit: "%"
        default: 50
- name: env
  label: Environment
  sections:
  - name: env_vars
    contents:
    - type: heading
      label: Environment variables
    - type: subtitle
      label: Set environment variables for your secrets and environment-specific configuration.
    - type: env-key-value-array
      label: 
      variable: container.env.normal
- name: advanced
  label: Advanced
  sections:
  - name: ingress_annotations
    contents:
    - type: heading
      label: Ingress Custom Annotations
    - type: subtitle
      label: Assign custom annotations to Ingress. These annotations will overwrite the annotations Porter assigns by default.
    - type: key-value-array
      variable: ingress.annotations
      settings:
        default: {}
  - name: health_check
    contents:
    - type: heading
      label: Custom Health Checks
    - type: subtitle
      label: Define custom health check endpoints to ensure zero down-time deployments.
    - type: checkbox
      variable: health.enabled
      label: Enable Custom Health Checks
      settings:
        default: false
  - name: health_check_endpoint
    show_if: health.enabled
    contents:
    - type: string-input
      label: Health Check Endpoint
      variable: health.path
      placeholder: "ex: /healthz"
      settings:
        default: /healthz
    - type: heading
      label: Custom Health Check Rules
    - type: subtitle
      label: Configure how many times a health check will be performed before deeming the container as failed. 
    - type: number-input
      label: Failure Threshold
      variable: health.failureThreshold
      placeholder: "ex: 3"
    - type: subtitle
      label: Configure the interval at which health check is repeated in the case of failure.
    - type: number-input
      label: Repeat Interval
      variable: health.periodSeconds
      placeholder: "ex: 30"
  - name: persistence_toggle
    contents:
    - type: heading
      label: Persistent Disks
    - type: subtitle
      label: Attach persistent disks to your deployment to retain data across releases.
    - type: checkbox
      label: Enable Persistence
      variable: pvc.enabled
  - name: persistent_storage
    show_if: pvc.enabled
    contents:
    - type: number-input
      label: Persistent Storage
      variable: pvc.storage
      placeholder: "ex: 20"
      settings:
        unit: Gi
        default: 20
    - type: string-input
      label: Mount Path
      variable: pvc.mountPath
      placeholder: "ex: /mypath"
      settings:
        default: /mypath
  - name: termination_grace_period
    contents:
    - type: heading
      label: Termination Grace Period
    - type: subtitle
      label: Specify how much time app processes have to gracefully shut down on SIGTERM.
    - type: number-input
      label: Termination Grace Period (seconds)
      variable: terminationGracePeriodSeconds
      placeholder: "ex: 30"
      settings:
        default: 30
  - name: container_hooks
    contents:
    - type: heading
      label: Container hooks
    - type: subtitle
      label: (Optional) Set post start or pre stop commands for this service.
    - type: string-input
      label: Post start command
      placeholder: "ex: /bin/sh ./myscript.sh"
      variable: container.lifecycle.postStart
    - type: string-input
      label: Pre stop command
      placeholder: "ex: /bin/sh ./myscript.sh"
      variable: container.lifecycle.preStop
  - name: cloud_sql_toggle
    show_if: currentCluster.service.is_gcp
    contents:
    - type: heading
      label: Google Cloud SQL
    - type: subtitle
      label: Securely connect to Google Cloud SQL (GKE only).
    - type: checkbox
      variable: cloudsql.enabled
      label: Enable Google Cloud SQL Proxy
      settings:
        default: false
  - name: cloud_sql_contents
    show_if: cloudsql.enabled
    contents:
    - type: string-input
      label: Instance Connection Name
      variable: cloudsql.connectionName
      placeholder: "ex: project-123:us-east1:pachyderm"
    - type: number-input
      label: DB Port
      variable: cloudsql.dbPort
      placeholder: "ex: 5432"
      settings:
        default: 5432
    - type: string-input
      label: Service Account JSON
      variable: cloudsql.serviceAccountJSON
      placeholder: "ex: { <SERVICE_ACCOUNT_JSON> }"`;

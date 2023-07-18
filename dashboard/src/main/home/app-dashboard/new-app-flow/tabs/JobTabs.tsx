import Input from "components/porter/Input";
import React, { useContext } from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { JobService } from "../serviceTypes";
import AnimateHeight, { Height } from "react-animate-height";
import cronstrue from 'cronstrue';
import Link from "components/porter/Link";
import { Context } from "shared/Context";
import { DATABASE_HEIGHT_DISABLED, DATABASE_HEIGHT_ENABLED } from "./utils";

interface Props {
  service: JobService;
  editService: (service: JobService) => void;
  setHeight: (height: Height) => void;
}

const JobTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight,
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>('main');
  const { currentCluster } = useContext(Context);

  const getScheduleDescription = () => {
    try {
      return <Text color="helper">This job runs: {cronstrue.toString(service.cronSchedule.value)}</Text>;
    } catch (err) {
      return <Text color="helper">
        Invalid cron schedule.{" "}
        <Link
          to={"https://crontab.cronhub.io/"}
          hasunderline
          target="_blank"
        >
          Need help?
        </Link>
      </Text>;
    }
  }

  const renderMain = () => {
    setHeight(276);
    return (
      <>
        <Spacer y={1} />
        <Input
          label="Start command"
          placeholder="ex: sh start.sh"
          disabled={service.startCommand.readOnly}
          value={service.startCommand.value}
          width="300px"
          setValue={(e) => { editService({ ...service, startCommand: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Cron schedule"
          placeholder="ex: */5 * * * *"
          value={service.cronSchedule.value}
          disabled={service.cronSchedule.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, cronSchedule: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={0.5} />
        {getScheduleDescription()}
      </>
    )
  };

  const renderResources = () => {
    setHeight(244);
    return (
      <>
        <Spacer y={1} />
        <Input
          label="CPUs (Millicores)"
          placeholder="ex: 0.5"
          value={service.cpu.value}
          disabled={service.cpu.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, cpu: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="RAM (MB)"
          placeholder="ex: 1"
          value={service.ram.value}
          disabled={service.ram.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, ram: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
      </>
    )
  };

  const renderDatabase = () => {
    setHeight(service.cloudsql.enabled.value ? DATABASE_HEIGHT_ENABLED : DATABASE_HEIGHT_DISABLED)
    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={service.cloudsql.enabled.value}
          disabled={service.cloudsql.enabled.readOnly}
          toggleChecked={() => {
            editService({
              ...service,
              cloudsql: {
                ...service.cloudsql,
                enabled: {
                  readOnly: false,
                  value: !service.cloudsql.enabled.value,
                },
              },
            });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Securely connect to Google Cloud SQL</Text>
        </Checkbox>
        <AnimateHeight height={service.cloudsql.enabled.value ? 'auto' : 0}>
          <Spacer y={1} />
          <Input
            label={"Instance Connection Name"}
            placeholder="ex: project-123:us-east1:pachyderm"
            value={service.cloudsql.connectionName.value}
            disabled={service.cloudsql.connectionName.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  connectionName: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={1} />
          <Input
            label={"DB Port"}
            placeholder="5432"
            value={service.cloudsql.dbPort.value}
            disabled={service.cloudsql.dbPort.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  dbPort: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={1} />
          <Input
            label={"Service Account JSON"}
            placeholder="ex: { <SERVICE_ACCOUNT_JSON> }"
            value={service.cloudsql.serviceAccountJson.value}
            disabled={service.cloudsql.serviceAccountJson.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  serviceAccountJson: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
        </AnimateHeight>
      </>
    );
  }

  const renderAdvanced = () => {
    setHeight(118);
    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={service.jobsExecuteConcurrently.value}
          toggleChecked={() => { editService({ ...service, jobsExecuteConcurrently: { readOnly: false, value: !service.jobsExecuteConcurrently.value } }) }}
          disabled={service.jobsExecuteConcurrently.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Allow jobs to execute concurrently</Text>
        </Checkbox>
      </>
    );
  };

  return (
    <>
      <TabSelector
        options={currentCluster?.cloud_provider === "GCP" ?
          [
            { label: 'Main', value: 'main' },
            { label: 'Resources', value: 'resources' },
            { label: "Database", value: "database" },
            { label: 'Advanced', value: 'advanced' },
          ] :
          [
            { label: 'Main', value: 'main' },
            { label: 'Resources', value: 'resources' },
            { label: 'Advanced', value: 'advanced' },
          ]
        }
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
      {currentTab === 'advanced' && renderAdvanced()}
      {currentTab === "database" && renderDatabase()}
    </>
  )
}

export default JobTabs;
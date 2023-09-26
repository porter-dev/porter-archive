import Input from "components/porter/Input";
import React, { useContext, useState } from "react"
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { ReleaseService } from "../serviceTypes";
import AnimateHeight, { Height } from "react-animate-height";
import { Context } from "shared/Context";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import { DATABASE_HEIGHT_DISABLED, DATABASE_HEIGHT_ENABLED, MIB_TO_GIB, MILI_TO_CORE, RESOURCE_ALLOCATION_RAM, UPPER_BOUND_SMART } from "./utils";
import InputSlider from "components/porter/InputSlider";
import SmartOptModal from "./SmartOptModal";
import { Switch } from "@material-ui/core";
import styled from "styled-components";

interface Props {
    service: ReleaseService;
    editService: (service: ReleaseService) => void;
    setHeight: (height: Height) => void;
    maxRAM: number;
    maxCPU: number;
    nodeCount?: number;
}

const ReleaseTabs: React.FC<Props> = ({
    service,
    editService,
    setHeight,
    maxRAM,
    maxCPU,
    nodeCount,
}) => {
    const [currentTab, setCurrentTab] = React.useState<string>('main');
    const { currentCluster } = useContext(Context);
    const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);
    const smartLimitRAM = (maxRAM - RESOURCE_ALLOCATION_RAM) * UPPER_BOUND_SMART
    const smartLimitCPU = (maxCPU - (RESOURCE_ALLOCATION_RAM * maxCPU / maxRAM)) * UPPER_BOUND_SMART
    const handleSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
        if ((service.cpu.value / MILI_TO_CORE) > (smartLimitCPU) || (service.ram.value / MILI_TO_CORE) > (smartLimitRAM)) {

            editService({
                ...service,
                cpu: {
                    readOnly: false,
                    value: (smartLimitCPU * MILI_TO_CORE).toString()
                },
                ram: {
                    readOnly: false,
                    value: (smartLimitRAM * MIB_TO_GIB).toString()
                },
                smartOptimization: !service.smartOptimization
            })
        }
        else {
            editService({
                ...service,
                smartOptimization: !service.smartOptimization
            })
        }

    };
    const renderMain = () => {
        setHeight(159);
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
            </>
        )
    };

    const renderResources = () => {
        setHeight(316);
        return (
            <>
                <Spacer y={1} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <StyledIcon
                        className="material-icons"
                        onClick={() => {
                            setShowNeedHelpModal(true)
                        }}
                    >
                        help_outline
                    </StyledIcon>
                    <Text style={{ marginRight: '10px' }}>Smart Optimization</Text>
                    <Switch
                        size="small"
                        color="primary"
                        checked={service.smartOptimization}
                        onChange={handleSwitch}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                </div>
                {showNeedHelpModal &&
                    <SmartOptModal
                        setModalVisible={setShowNeedHelpModal}
                    />}
                <>
                    <InputSlider
                        label="CPUs: "
                        unit="Cores"
                        override={!service.smartOptimization}
                        min={0}
                        max={Math.floor((maxCPU - (RESOURCE_ALLOCATION_RAM * maxCPU / maxRAM)) * 10) / 10}
                        nodeCount={nodeCount}
                        color={"#3f51b5"}
                        smartLimit={smartLimitCPU}
                        value={(service.cpu.value / MILI_TO_CORE).toString()}
                        setValue={(e) => {
                            service.smartOptimization ? editService({ ...service, cpu: { readOnly: false, value: Math.round(e * MILI_TO_CORE * 10) / 10 }, ram: { readOnly: false, value: Math.round((e * maxRAM / maxCPU * MIB_TO_GIB) * 10) / 10 } }) :
                                editService({ ...service, cpu: { readOnly: false, value: e * MILI_TO_CORE } });
                        }}
                        step={0.1}
                        disabled={false}
                        disabledTooltip={"You may only edit this field in your porter.yaml."} />

                    <Spacer y={1} />

                    <InputSlider
                        label="RAM: "
                        unit="GiB"
                        min={0}
                        override={!service.smartOptimization}
                        nodeCount={nodeCount}
                        smartLimit={smartLimitRAM}
                        max={Math.floor((maxRAM - RESOURCE_ALLOCATION_RAM) * 10) / 10}
                        color={"#3f51b5"}
                        value={(service.ram.value / MIB_TO_GIB).toString()}
                        setValue={(e) => {
                            service.smartOptimization ? editService({ ...service, ram: { readOnly: false, value: Math.round(e * MIB_TO_GIB * 10) / 10 }, cpu: { readOnly: false, value: Math.round((e * (maxCPU / maxRAM) * MILI_TO_CORE) * 10) / 10 } }) :
                                editService({ ...service, ram: { readOnly: false, value: e * MIB_TO_GIB } });
                        }}

                        disabled={service.ram.readOnly}
                        step={0.1}
                        disabledTooltip={"You may only edit this field in your porter.yaml."} />
                </>
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
                        value={service.cloudsql.serviceAccountJSON.value}
                        disabled={service.cloudsql.serviceAccountJSON.readOnly}
                        width="300px"
                        setValue={(e) => {
                            editService({
                                ...service,
                                cloudsql: {
                                    ...service.cloudsql,
                                    serviceAccountJSON: { readOnly: false, value: e },
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


    return (
        <>
            <TabSelector
                options={currentCluster?.cloud_provider === "GCP" || (currentCluster?.service === "gke") ?
                    [
                        { label: 'Main', value: 'main' },
                        { label: 'Resources', value: 'resources' },
                        { label: "Database", value: "database" },
                    ] :
                    [
                        { label: 'Main', value: 'main' },
                        { label: 'Resources', value: 'resources' },
                    ]
                }
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
            />
            {currentTab === 'main' && renderMain()}
            {currentTab === 'resources' && renderResources()}
            {currentTab === "database" && renderDatabase()}
        </>
    )
}

export default ReleaseTabs;

const StyledIcon = styled.i`
  cursor: pointer;
  font-size: 16px; 
  margin-right : 5px;
  &:hover {
    color: #666;  
  }
`;
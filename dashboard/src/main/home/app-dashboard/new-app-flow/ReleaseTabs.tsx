import Input from "components/porter/Input";
import React from "react"
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { ReleaseService } from "./serviceTypes";
import { Height } from "react-animate-height";

interface Props {
    service: ReleaseService;
    editService: (service: ReleaseService) => void;
    setHeight: (height: Height) => void;
}

const ReleaseTabs: React.FC<Props> = ({
    service,
    editService,
    setHeight,
}) => {
    const [currentTab, setCurrentTab] = React.useState<string>('main');

    const renderMain = () => {
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
        return (
            <>
                <Spacer y={1} />
                <Input
                    label="CPU (Millicores)"
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


    return (
        <>
            <TabSelector
                options={[
                    { label: 'Main', value: 'main' },
                    { label: 'Resources', value: 'resources' },
                ]}
                currentTab={currentTab}
                setCurrentTab={(value: string) => {
                    if (value === 'main') {
                        setHeight(159);
                    } else if (value === 'resources') {
                        setHeight(244);
                    }
                    setCurrentTab(value);
                }}
            />
            {currentTab === 'main' && renderMain()}
            {currentTab === 'resources' && renderResources()}
        </>
    )
}

export default ReleaseTabs;
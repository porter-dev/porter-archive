import Text from "components/porter/Text";
import React from "react";
import styled from "styled-components";
import { GenericLogFilter } from "./types";
import Spacer from "components/porter/Spacer";
import Select from "components/porter/Select";

type Props = {
    filter: GenericLogFilter;
    selectedValue: string;
};

const LogFilterComponent: React.FC<Props> = ({
    filter,
    selectedValue,
}) => {
    return (
        <StyledLogFilterComponent>
            <Text>{filter.displayName}</Text>
            <Spacer inline x={0.5} />
            <Select
                options={[filter.default, ...filter.options]}
                height={"30px"}
                value={selectedValue}
                setValue={filter.setValue}
            />
        </StyledLogFilterComponent>
    );
};

export default LogFilterComponent;

const StyledLogFilterComponent = styled.div`
    display: flex;
    align-items: center;
    animation: fadeIn 0.3s 0s;
    @keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
    }
`;
import Text from "components/porter/Text";
import React, { useEffect } from "react";
import styled from "styled-components";
import { GenericFilterOption } from "./types";
import Spacer from "components/porter/Spacer";
import Select from "components/porter/Select";

type Props = {
    name: string;
    options: GenericFilterOption[];
};

const LogFilterComponent: React.FC<Props> = ({
    options,
    name,
}) => {
    useEffect(() => {
        // Do something
    }, []);

    return (
        <StyledLogFilterComponent>
            <Text>{name}</Text>
            <Spacer inline x={0.5} />
            <Select options={options} height={"30px"} />
        </StyledLogFilterComponent>
    );
};

export default LogFilterComponent;

const StyledLogFilterComponent = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
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
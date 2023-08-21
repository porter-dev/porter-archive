import { RouteComponentProps, withRouter } from "react-router";
import styled, { css } from "styled-components";
import React, { useContext, useEffect, useState } from "react";
import Loading from "components/Loading";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";


type Props = RouteComponentProps & {
    closeModal: () => void;

}

const ProvisionClusterModal: React.FC<Props> = ({
    closeModal,

}) => {

    return (
        <Modal closeModal={closeModal}>
            <Text size={16}>
                Load env group
            </Text>



        </Modal >
    )
}

export default ProvisionClusterModal;

